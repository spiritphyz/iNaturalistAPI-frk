const _ = require( "lodash" );
const { initialize } = require( "express-openapi" );
const swaggerUi = require( "swagger-ui-express" );
const bodyParser = require( "body-parser" );
const fs = require( "fs" );
const path = require( "path" );
const multer = require( "multer" );
const crypto = require( "crypto" );
const jwt = require( "jsonwebtoken" );
const openapiCoercer = require( "openapi-request-coercer" );
const config = require( "./config" );
const v2ApiDoc = require( "./openapi/doc" );
const util = require( "./lib/util" );
const Logstasher = require( "./lib/logstasher" );

const main = ( ) => {
  const logstashPath = path.join(
    path.dirname( fs.realpathSync( __filename ) ), "./log", "inaturalist_api.4000.log"
  );
  Logstasher.setLogStreamFilePath( logstashPath );

  const InaturalistAPI = require( "./lib/inaturalist_api" ); // eslint-disable-line global-require

  const app = InaturalistAPI.server( );

  let initializedApi = null;

  const sendWrapper = ( req, res, err, results ) => {
    if ( err ) { return void initializedApi.args.errorMiddleware( err, null, res, null ); }
    res.status( 200 ).header( "Content-Type", "application/json" ).send( results );
  };

  app.use( bodyParser.json( {
    type: req => {
      // Parse the request body for everything other than multipart requests,
      // which should specify body data as plain old form data which express can
      // parse on its own.
      if ( !req.headers["content-type"] ) {
        // console.log( "[DEBUG] no content-type" );
        return true;
      }
      return req.headers["content-type"].match( /multipart/ ) === null;
    }
  } ) );

  app.use( ( req, res, next ) => {
    util.timingMiddleware( req, res, next );
  } );

  // Middleware to detect to X-HTTP-Method-Override header. We use this header
  // to support long, complex retrieval requests at POST endpoints as well as
  // the more traditional creation requests to the same POST endpoints. For
  // example, under normal circumstances you might POST /observations to create
  // an observation, but if you set the X-HTTP-Method-Override to GET and POST
  // to /observations, you could instead send a complicated query object to
  // retrieve records (see requestFields below)
  //
  // Note that this requires that a GET or a POST definition for an endpoint
  // defines a X-HTTP-Method-Override param in the header.
  //
  // When you POST, the presumption is that the URL has no query and will match
  // the URL pattern exactly
  app.use( ( req, res, next ) => {
    const methodOverride = req.header( "X-HTTP-Method-Override" );
    if ( req.method === "POST" && methodOverride === "GET" && initializedApi ) {
      const basePath = initializedApi.basePaths[0].path;
      const basePathRegex = new RegExp( `^${_.escapeRegExp( basePath )}` );
      const apiPath = req.path.replace( basePathRegex, "" );
      let apiMethod = initializedApi.apiDoc.paths[apiPath];
      const paths = _.keys( initializedApi.apiDoc.paths );
      for ( let i = 0; i < paths.length; i += 1 ) {
        const knownPath = paths[i];
        // This is admittedly crude: assumes the URL exactly matches the route pattern
        const pathRegex = new RegExp( `^${knownPath.replace( /\{.+?\}/, ".+?" )}$` );
        if ( pathRegex.test( apiPath ) ) {
          apiMethod = initializedApi.apiDoc.paths[knownPath];
          break;
        }
      }
      if ( apiMethod ) {
        let allowsOverride = false;
        if ( apiMethod.post ) {
          allowsOverride = _.find( apiMethod.post.parameters, p => (
            p.name === "X-HTTP-Method-Override" && p.in === "header"
          ) );
        } else if ( apiMethod.get ) {
          allowsOverride = _.find( apiMethod.get.parameters, p => (
            p.name === "X-HTTP-Method-Override" && p.in === "header"
          ) );
        }
        if ( allowsOverride ) {
          if ( _.isEmpty( req.body ) ) {
            const err = new Error( "X-HTTP-Method-Override requires Content-Type: application/json" );
            err.status = 422;
            return void initializedApi.args.errorMiddleware( err, null, res, null );
          }
          req.originalMethod = req.originalMethod || req.method;
          req.method = "GET";
        }
      }
    }
    next( );
  } );

  // Set up multer to handle multipart file uploads
  const storage = multer.diskStorage( {
    destination: ( req, file, callback ) => {
      crypto.pseudoRandomBytes( 16, ( err, raw ) => {
        const time = Date.now( );
        const hash = raw.toString( "hex" );
        // create a directory in which to store the upload
        const uploadDir = `openapi/uploads/tmp_${time}_${hash}`;
        if ( !fs.existsSync( uploadDir ) ) {
          fs.mkdirSync( uploadDir );
        }
        callback( null, uploadDir );
      } );
    },
    filename: ( req, file, callback ) => callback( null, file.originalname )
  } );
  const upload = multer( { storage } );

  // If a schema looks like one of our custom schemas, return the custom schema.
  // Otherwise return the schema that was passed in
  const resolveSchema = ( req, schema ) => {
    const schemaRef = schema.$ref;
    if ( schemaRef && schemaRef.match( /#\/components\/schemas\// ) ) {
      const schemaName = schemaRef.replace( "#/components/schemas/", "" );
      return req.apiDoc.components.schemas[schemaName];
    }
    return schema;
  };

  // Extract the requested response fields
  const requestFields = req => {
    const fields = req.body.fields || req.query.fields;
    if ( _.isObject( fields ) ) {
      return fields;
    }
    if ( !_.isEmpty( fields ) ) {
      try {
        const fieldsJson = JSON.parse( fields );
        return fieldsJson;
      } catch {
        // ignore parse failures
      }
      const fieldsStringMatch = fields.match( /^[a-z_]+(,[a-z_]+)*$/ );
      if ( fieldsStringMatch ) {
        return fields.split( "," );
      }
      return false;
    }
    return null;
  };

  const responseItemSchema = req => {
    if ( req.operationDoc
      && req.operationDoc.responses["200"]
      && req.operationDoc.responses["200"].content["application/json"]
      && req.operationDoc.responses["200"].content["application/json"].schema ) {
      const responseSchema = resolveSchema( req,
        req.operationDoc.responses["200"].content["application/json"].schema );
      if ( responseSchema.properties
        && responseSchema.properties.results
        && responseSchema.properties.results.items ) {
        return resolveSchema( req, responseSchema.properties.results );
      }
    }
    return null;
  };


  // These methods take the requested fields, select the ones that match the
  // schema definition for the endpoint that was hit, and return only those
  // fields. The two methods refer to each other, so we need to define a stub
  // first.
  let applyFieldSelectionToItem = ( ) => { };
  const applyFieldSelectionToObject = ( req, item, fieldsRequested, itemSchema ) => {
    let fieldsToReturn = { };
    // Make sure we always return required fields
    _.each( itemSchema.required, k => {
      fieldsToReturn[k] = true;
    } );
    // Requested fields might be specified as a string, e.g. "date", an array,
    // e.g. ["date"], or an object, e.g. {date: true} or {date: "date"}. Here
    // we're normalizing them into an object
    if ( _.isArray( fieldsRequested ) ) {
      fieldsToReturn = Object.assign( fieldsToReturn, _.keyBy( fieldsRequested, r => r ) );
    } else if ( _.isString( fieldsRequested ) ) {
      fieldsToReturn = Object.assign( fieldsToReturn, _.keyBy( [fieldsRequested], r => r ) );
    } else {
      fieldsToReturn = Object.assign( fieldsToReturn, fieldsRequested );
    }
    const prunedItem = { };
    if ( fieldsToReturn.all ) {
      _.each( itemSchema.properties, ( v, k ) => {
        const propertySchema = resolveSchema( req, v );
        prunedItem[k] = applyFieldSelectionToItem( req, item[k], { all: true }, propertySchema );
      } );
    } else {
      // loop through the requested fields
      _.each( fieldsToReturn, ( v, k ) => {
        // the root item has the field, and is in the root item definition
        const fieldSchema = itemSchema.properties[k];
        if ( item[k] !== undefined && fieldSchema ) {
          const propertySchema = resolveSchema( req, fieldSchema );
          prunedItem[k] = applyFieldSelectionToItem( req, item[k], v, propertySchema );
        }
      } );
    }
    return prunedItem;
  };

  applyFieldSelectionToItem = ( req, item, fields, itemSchema ) => {
    if ( itemSchema.type === "array" && _.isArray( item ) ) {
      item = _.map( item, i => applyFieldSelectionToItem(
        req, i, fields, resolveSchema( req, itemSchema.items )
      ) );
    } else if ( itemSchema.type === "object" && _.isObject( item ) ) {
      item = applyFieldSelectionToObject( req, item, fields, itemSchema );
    }
    return item;
  };

  const validateAllResponses = ( req, res, next ) => {
    const strictValidation = !!req.apiDoc["x-express-openapi-validation-strict"];
    if ( typeof res.validateResponse === "function" ) {
      const { send } = res;
      res.send = ( ...args ) => {
        const onlyWarn = !strictValidation;
        if ( res.get( "x-express-openapi-validated" ) !== undefined ) {
          return send.apply( res, args );
        }
        const body = args[0];
        const itemSchema = responseItemSchema( req );
        if (
          body
          && !_.isEmpty( body.results )
          && itemSchema
        ) {
          const fields = requestFields( req );
          if ( fields === false ) {
            res.set( "x-express-openapi-validated", true );
            const error = new Error( "invalid fields parameter" );
            error.status = 422;
            return sendWrapper( req, res, error );
          }
          if ( fields !== "all" ) {
            body.results = applyFieldSelectionToItem( req, body.results, fields, itemSchema );
          }
        }

        let validation = res.validateResponse( res.statusCode, body );
        let validationMessage;
        if ( validation === undefined ) {
          validation = { message: undefined, errors: undefined };
        }
        if ( validation.errors ) {
          const errorList = Array.from( validation.errors ).map( e => e.message ).join( "," );
          validationMessage = `Invalid response for status code ${res.statusCode}: ${errorList}`;
          // Set to avoid a loop, and to provide the original status code
          res.set( "x-express-openapi-validation-error-for", res.statusCode.toString( ) );
        }
        res.set( "x-express-openapi-validated", true );
        if ( onlyWarn || !validation.errors ) {
          if ( _.has( req.originalQuery || req.query, "pretty" ) ) {
            args[0] = JSON.stringify( body, null, 2 );
          }
          return send.apply( res, args );
        }
        return sendWrapper( req, res, new Error( validationMessage ) );
      };
    }
    next( );
  };

  const jwtValidate = req => new Promise( resolve => {
    if ( !req.headers.authorization ) {
      return void resolve( );
    }
    const token = _.last( req.headers.authorization.split( /\s+/ ) );
    jwt.verify( token, config.jwtSecret || "secret", { algorithms: ["HS512"] }, ( err, payload ) => {
      if ( err ) {
        return void resolve( );
      }
      req.userSession = payload;
      resolve( true );
    } );
  } );

  initializedApi = initialize( {
    app,
    docPath: "api-docs",
    apiDoc: {
      ...v2ApiDoc,
      "x-express-openapi-additional-middleware": [validateAllResponses],
      "x-express-openapi-validation-strict": true
    },
    enableObjectCoercion: true,
    dependencies: {
      sendWrapper
    },
    securityFilter: ( req, res ) => {
      // remove x-express-* attributes which don't need to be in the official documentation
      res.status( 200 ).json( _.pickBy( req.apiDoc, ( value, key ) => !key.match( /^x-/ ) ) );
    },
    paths: "./openapi/paths/v2",
    promiseMode: true,
    securityHandlers: {
      jwtOptional: req => jwtValidate( req ).then( ( ) => true ),
      jwtRequired: req => jwtValidate( req )
    },
    consumesMiddleware: {
      // TODO: custom coercion for JSON bodies?
      "multipart/form-data": ( req, res, next ) => {
        const knownUploadFields = [];
        const { properties } = req.operationDoc.requestBody.content["multipart/form-data"].schema;
        _.each( properties, ( schema, name ) => {
          if ( schema.type === "string" && schema.format === "binary" ) {
            knownUploadFields.push( name );
          }
        } );
        const props = req.operationDoc.requestBody.content["multipart/form-data"].schema.properties;
        const parameters = _.map( _.keys( props ), k => ( {
          in: req.headers["content-type"] === "application/json" ? "body" : "formData",
          name: k,
          schema: req.operationDoc.requestBody.content["multipart/form-data"].schema.properties[k]
        } ) );
        const coercer = new openapiCoercer.default( {
          extensionBase: "x-express-openapi-coercion",
          loggingKey: "express-openapi-coercion",
          parameters,
          enableObjectCoercion: true
        } );
        coercer.coerce( req );
        const uploadMiddleware = upload.fields(
          _.map( knownUploadFields, f => ( { name: f } ) )
        );
        uploadMiddleware( req, res, ( ) => {
          const originalBody = _.cloneDeep( req.body );
          const newBody = { };

          // I think this is just removing blank strings?!
          _.each( originalBody, ( v, k ) => {
            if ( _.isObject( v ) ) {
              newBody[k] = { };
              _.each( v, ( vv, kk ) => {
                if ( vv !== "" ) {
                  newBody[k][kk] = vv;
                }
              } );
            } else {
              newBody[k] = v;
            }
          } );

          // multer puts files in a `files` attribute, but we need them in the
          // body
          _.each( knownUploadFields, f => {
            newBody[f] = req.files[f];
          } );

          req.body = newBody;
          coercer.coerce( req );
          next( );
        } );
      }
    },
    // this needs all 4 parameters even if next is not used
    /* eslint-disable-next-line no-unused-vars */
    errorMiddleware: ( err, req, res, next ) => {
      const status = err.status || ( err.response && err.response.status );
      if ( err.errorCode === "authentication.openapi.security" ) {
        res.status( status || 401 ).json( {
          status: status || 401,
          message: "Unauthorized"
        } );
        return;
      }
      // Rails will often return errors with a json body. Is there a good way to
      // incorporate that into the response here?
      // if ( err.response ) {
      //   err.response.json( ).then( json => {
      //     console.log( "[DEBUG] json: ", json );
      //   } );
      // }
      console.log( "Error trace from errorMiddleware ------->" );
      console.trace( err );
      res.status( status || 500 ).json( err instanceof Error
        ? {
          status: status || 500,
          message: err.message,
          // TODO Remove in production, right?
          stack: err.stack.split( "\n" ),
          from: "errorMiddleware"
        } : err );
    }
  } );

  app.get( "/v2/", ( req, res ) => res.redirect( "/v2/docs" ) );
  app.use( "/v2/docs", swaggerUi.serve, swaggerUi.setup( initializedApi.apiDoc ) );
  return app;
};

if ( require.main === module ) {
  main( ).listen( 4000 );
}

module.exports = main( );