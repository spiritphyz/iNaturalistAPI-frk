const { expect } = require( "chai" );
const fs = require( "fs" );
const request = require( "supertest" );
const nock = require( "nock" );
const jwt = require( "jsonwebtoken" );
const config = require( "../../../config.js" );
const app = require( "../../../openapi_app" );

const fixtures = JSON.parse( fs.readFileSync( "schema/fixtures.js" ) );

describe( "Observations", ( ) => {
  const fixtureObs = fixtures.elasticsearch.observations.observation[0];
  describe( "show", ( ) => {
    it( "returns json", done => {
      request( app ).get( `/v2/observations/${fixtureObs.uuid}` ).expect( res => {
        expect( res.body.results[0].uuid ).to.eq( fixtureObs.uuid );
      } ).expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
    it( "returns the uuid when specified in the fields query param", done => {
      request( app ).get( `/v2/observations/${fixtureObs.uuid}?fields=id,uuid` ).expect( res => {
        expect( res.body.results[0].uuid ).to.eq( fixtureObs.uuid );
      } ).expect( 200, done );
    } );
    it( "returns the uuid and quality_grade when all fields", done => {
      request( app ).get( `/v2/observations/${fixtureObs.uuid}?fields=all` ).expect( res => {
        expect( res.body.results[0].uuid ).to.eq( fixtureObs.uuid );
        expect( res.body.results[0].quality_grade ).to.eq( fixtureObs.quality_grade );
      } ).expect( 200, done );
    } );
    it( "returns the user name and login when requesting all user fields", done => {
      request( app )
        .post( `/v2/observations/${fixtureObs.uuid}` )
        .set( "Content-Type", "application/json" )
        .send( {
          fields: { user: "all" }
        } )
        .set( "X-HTTP-Method-Override", "GET" )
        .expect( res => {
          expect( res.body.results[0].user.login ).to.eq( fixtureObs.user.login );
          expect( res.body.results[0].user.name ).to.eq( fixtureObs.user.name );
        } )
        .expect( 200, done );
    } );
  } );

  describe( "search", ( ) => {
    it( "returns json", done => {
      request( app ).get( "/v2/observations" ).expect( res => {
        expect( res.body.results[0].uuid ).to.not.be.undefined;
      } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
    it( "returns user when specified in the fields query param", done => {
      request( app ).get( "/v2/observations?fields=user" ).expect( res => {
        expect( res.body.results[0].user ).to.not.be.undefined;
      } ).expect( 200, done );
    } );
    it( "should error when you POST with X-HTTP-Method-Override set to GET and a multipart/form-data payload", done => {
      request( app )
        .post( "/v2/observations" )
        .send( `user_id=${fixtureObs.user.id}&fields=user` )
        .set( "Content-Type", "multipart/form-data" )
        .set( "X-HTTP-Method-Override", "GET" )
        .expect( res => {
          expect( res.body.status ).to.eq( 422 );
        } )
        .expect( 422, done );
    } );
    it( "should search when you POST with X-HTTP-Method-Override set to GET and a JSON payload", done => {
      request( app )
        .post( "/v2/observations" )
        .set( "Content-Type", "application/json" )
        .send( {
          user_id: fixtureObs.user.id,
          fields: ["user"]
        } )
        .set( "X-HTTP-Method-Override", "GET" )
        .expect( res => {
          expect( res.body.results[0].user.id ).to.eq( fixtureObs.user.id );
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );

  describe( "create", ( ) => {
    it( "returns private coordinates when geoprivacy is private", done => {
      const o = fixtures.elasticsearch.observations.observation[5];
      expect( o.geoprivacy ).to.eq( "private" );
      expect( o.location ).to.be.undefined;
      const token = jwt.sign( { user_id: 333 }, config.jwtSecret || "secret",
        { algorithm: "HS512" } );
      nock( "http://localhost:3000" )
        .post( "/observations" )
        .reply( 200, [{ id: o.id, uuid: o.uuid }] );
      request( app ).post( "/v2/observations" )
        .set( "Authorization", token )
        .set( "Content-Type", "multipart/form-data" )
        // it doesn't really matter what we post since we're just stubbing the
        // Rails app to return obs 6 to load from the ES index
        .field( "observation", JSON.stringify( { } ) )
        // We're testing with these fields so let's make sure to get them in the response
        .field( "fields", JSON.stringify( {
          private_geojson: {
            coordinates: true
          },
          private_location: true
        } ) )
        .expect( 200 )
        .expect( res => {
          const resObs = res.body.results[0];
          expect( resObs.private_geojson.coordinates[1] ).to
            .eq( o.private_geojson.coordinates[1] );
          expect( resObs.private_location ).not.to.be.undefined;
          expect( resObs.private_location ).to.eq( o.private_location );
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );

  // // This test won't work b/c for some reason nock won't stub requests made by
  // // inatjs ~~ kueda 20200418
  // describe.only( "taxon_summary", ( ) => {
  //   it( "should include a relevant listed taxon", done => {
  //     const o = fixtures.elasticsearch.observations.observation[0];
  //     const railsResponse = {
  //       conservation_status: {},
  //       listed_taxon: {
  //         establishment_means_label: "introduced"
  //       },
  //       wikipedia_summary: "bar"
  //     };
  //     nock( "http://localhost:3000" )
  //       .get( `/observations/${o.id}/taxon_summary` )
  //       .reply( 200, railsResponse );
  //     request( app ).get( `/v2/observations/${o.uuid}/taxon_summary` )
  //       .set( "Content-Type", "application/json" )
  //       .expect( 200 )
  //       .expect( res => {
  //         expect( res.body.listed_taxon.establishment_means_label )
  //           .to.eq( railsResponse.listed_taxon.establishment_means_label );
  //       } )
  //       .expect( 200, done );
  //   } );
  // } );
} );