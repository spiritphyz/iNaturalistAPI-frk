const _ = require( "lodash" );
const fs = require( "fs" );
const j2s = require( "hapi-joi-to-swagger" );

const schemas = { };
fs.readdirSync( "./openapi/schema/response" ).forEach( file => {
  const modelName = _.upperFirst( _.camelCase( file.replace( /\.js$/, "" ) ) );
  /* eslint-disable-next-line import/no-dynamic-require, global-require */
  const schema = require( `./schema/response/${file}` );
  const { swagger, components } = j2s( schema, _.values( schemas ) );
  _.each( components.schemas, ( componentSchema, componentName ) => {
    schemas[componentName] = schemas[componentName] || componentSchema;
  } );
  schemas[modelName] = schemas[modelName] || swagger;
} );

fs.readdirSync( "./openapi/schema/request" ).forEach( file => {
  const modelName = _.upperFirst( _.camelCase( file.replace( /\.js$/, "" ) ) );
  /* eslint-disable-next-line import/no-dynamic-require, global-require */
  const schema = require( `./schema/request/${file}` );
  const { swagger, components } = j2s( schema, _.values( schemas ) );
  _.each( components.schemas, ( componentSchema, componentName ) => {
    schemas[componentName] = schemas[componentName] || componentSchema;
  } );
  schemas[modelName] = schemas[modelName] || swagger;
} );

const url = "http://localhost:4000/v2";

const apiDoc = {
  openapi: "3.0.0",
  servers: [{
    url
  }],
  info: {
    title: "Test iNaturalist Version 2 API",
    version: "1.0.0",
    description: `## ${url}
These API methods return data in JSON/JSONP and PNG response formats. Visit our
[developers page](https://www.inaturalist.org/pages/developers) for more
information. Write operations that expect and return JSON describe a single
\`body\` parameter that represents the request body, which should be specified
as JSON. See the "Model" of each body parameter for attributes that we
accept in these JSON objects.

Multiple values for a single URL parameter should be separated by commas,
e.g. \`taxon_id=1,2,3\`.

Map tiles are generated using the
[node-mapnik](https://github.com/mapnik/node-mapnik) library, following the
XYZ map tiling scheme. The "Observation Tile" methods accept nearly all the
parameters of the observation search APIs, and will generate map tiles
reflecting the same observations returned by searches. These
"Observation Tile" methods have corresponding
[UTFGrid](https://github.com/mapbox/utfgrid-spec) JSON
responses which return information needed to make interactive maps.

Authentication in the Node API is handled via JSON Web Tokens (JWT). To
obtain one, make an [OAuth-authenticated
request](http://www.inaturalist.org/pages/api+reference#auth) to
<https://www.inaturalist.org/users/api_token>. Each JWT will expire after 24
hours. Authentication required for all PUT and POST requests. Some GET
requests will also include private information like hidden coordinates if
the authenticated user has permission to view them.

By default, all endpoints will return a very minimal response, usually just the
UUID. To receive more data, include the \`fields\` parameter to specify exactly
what you want in the response. For GET requests, this can be as simple as
[${url}/observations?fields=species_guess,observed_on](${url}/observations?fields=species_guess,observed_on)
to return the \`species_guess\` and \`observed_on\` fields of the observations.

For more complex responses, all GET endpoints also support POST requests
with the \`X-HTTP-Method-Override: GET\` header to so you can specify the
response fields in a JSON object, e.g.
\`\`\`
  curl -XPOST \\
    -H "X-HTTP-Method-Override: GET" \\
    -H "Content-Type: application/json" \\
    -d '{fields: {"species_guess": true, "geojson": {"coordinates": true}}' \\
    "${url}/observations"
\`\`\`

iNaturalist Website: <https://www.inaturalist.org/>

Open Source Software: <https://github.com/inaturalist/>

## About iNaturalist

[iNaturalist](https://www.inaturalist.org/) is a global community of
naturalists, scientists, and members of the public sharing over a million
wildlife sightings to teach one another about the natural world while
creating high quality citizen science data for science and conservation.
The iNaturalist technology infrastructure and open source software is
administered by the [California Academy of Sciences](https://www.calacademy.org/) as
part of their mission to explore, explain, and sustain life on Earth.

## Terms of Use

Use of this API is subject to the iNaturalist
[Terms of Service](https://www.inaturalist.org/terms) and
[Privacy Policy](https://www.inaturalist.org/privacy). We will block any
use of our API that violates our Terms or Privacy Policy without notice.
The API is intended to support application development, not data scraping.
For pre- generated data exports, see
<https://www.inaturalist.org/pages/developers>.

Please note that we throttle API usage to a max of 100 requests per minute,
though we ask that you try to keep it to 60 requests per minute or lower,
and to keep under 10,000 requests per day. If we notice usage that has
serious impact on our performance we may institute blocks without
notification.

Terms of Service: <https://www.inaturalist.org/terms>

Privacy Policy: <https://www.inaturalist.org/privacy>`
  },
  components: {
    schemas,
    securitySchemes: {
      jwtOptional: {
        type: "apiKey",
        name: "Authorization",
        in: "header"
      },
      jwtRequired: {
        type: "apiKey",
        name: "Authorization",
        in: "header"
      }
    },
    responses: {
      Error: {
        description: "Unexpected error",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/Error"
            }
          }
        }
      }
    }
  },
  paths: { }
};


module.exports = apiDoc;