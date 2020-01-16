const Joi = require( "@hapi/joi" );

module.exports = Joi.object( ).keys( {
  acc: Joi.boolean( ),
  captive: Joi.boolean( ),
  endemic: Joi.boolean( ),
  geo: Joi.boolean( ),
  id_please: Joi.boolean( ),
  identified: Joi.boolean( ),
  introduced: Joi.boolean( ),
  mappable: Joi.boolean( ),
  native: Joi.boolean( ),
  out_of_range: Joi.boolean( ),
  pcid: Joi.boolean( ).meta( { deprecated: true } ),
  photos: Joi.boolean( ),
  popular: Joi.boolean( ),
  sounds: Joi.boolean( ),
  taxon_is_active: Joi.boolean( ),
  threatened: Joi.boolean( ),
  verifiable: Joi.boolean( ),
  id: Joi.array( ).items( Joi.number( ).integer( ) ),
  not_id: Joi.array( ).items( Joi.number( ).integer( ) ),
  license: Joi.array( ).items( Joi.string( ).valid(
    "cc-by",
    "cc-by-nc",
    "cc-by-nd",
    "cc-by-sa",
    "cc-by-nc-nd",
    "cc-by-nc-sa",
    "cc0"
  ) ),
  photo_license: Joi.array( ).items( Joi.string( ).valid(
    "cc-by",
    "cc-by-nc",
    "cc-by-nd",
    "cc-by-sa",
    "cc-by-nc-nd",
    "cc-by-nc-sa",
    "cc0"
  ) ),
  place_id: Joi.array( ).items( Joi.number( ).integer( ) ),
  project_id: Joi.array( ).items( Joi.number( ).integer( ) ),
  rank: Joi.array( ).items( Joi.string( ).valid(
    "kingdom",
    "phylum",
    "subphylum",
    "superclass",
    "class",
    "subclass",
    "superorder",
    "order",
    "suborder",
    "infraorder",
    "superfamily",
    "epifamily",
    "family",
    "subfamily",
    "supertribe",
    "tribe",
    "subtribe",
    "genus",
    "genushybrid",
    "species",
    "hybrid",
    "subspecies",
    "variety",
    "form"
  ) ),
  site_id: Joi.array( ).items( Joi.number( ).integer( ) ),
  sound_license: Joi.array( ).items( Joi.string( ).valid(
    "cc-by",
    "cc-by-nc",
    "cc-by-nd",
    "cc-by-sa",
    "cc-by-nc-nd",
    "cc-by-nc-sa",
    "cc0"
  ) ),
  taxon_id: Joi.array( ).items( Joi.number( ).integer( ) ),
  without_taxon_id: Joi.array( ).items( Joi.number( ).integer( ) ),
  taxon_name: Joi.string( ),
  user_id: Joi.array( ).items( Joi.string( ) ),
  user_login: Joi.array( ).items( Joi.string( ) ),
  day: Joi.array( ).items( Joi.number( ).integer( ) ),
  month: Joi.array( ).items( Joi.number( ).integer( ) ),
  year: Joi.array( ).items( Joi.number( ).integer( ) ),
  term_id: Joi.array( ).items( Joi.number( ).integer( ) ),
  term_value_id: Joi.array( ).items( Joi.number( ).integer( ) ),
  without_term_value_id: Joi.array( ).items( Joi.number( ).integer( ) ),
  acc_above: Joi.number( ).integer( ),
  acc_below: Joi.number( ).integer( ),
  d1: Joi.string( ),
  d2: Joi.string( ),
  created_d1: Joi.string( ),
  created_d2: Joi.string( ),
  created_on: Joi.string( ),
  observed_on: Joi.string( ),
  unobserved_by_user_id: Joi.string( ),
  apply_project_rules_for: Joi.string( ),
  cs: Joi.string( ),
  csa: Joi.string( ),
  csi: Joi.array( ).items( Joi.string( ).valid(
    "LC",
    "NT",
    "VU",
    "EN",
    "CR",
    "EW",
    "EX"
  ) ),
  geoprivacy: Joi.array( ).items( Joi.string( ).valid(
    "obscured",
    "obscured_private",
    "open",
    "private"
  ) ),
  taxon_geoprivacy: Joi.array( ).items( Joi.string( ).valid(
    "obscured",
    "obscured_private",
    "open",
    "private"
  ) ),
  hrank: Joi.array( ).items( Joi.string( ).valid(
    "kingdom",
    "phylum",
    "subphylum",
    "superclass",
    "class",
    "subclass",
    "superorder",
    "order",
    "suborder",
    "infraorder",
    "superfamily",
    "epifamily",
    "family",
    "subfamily",
    "supertribe",
    "tribe",
    "subtribe",
    "genus",
    "genushybrid",
    "species",
    "hybrid",
    "subspecies",
    "variety",
    "form"
  ) ),
  lrank: Joi.array( ).items( Joi.string( ).valid(
    "kingdom",
    "phylum",
    "subphylum",
    "superclass",
    "class",
    "subclass",
    "superorder",
    "order",
    "suborder",
    "infraorder",
    "superfamily",
    "epifamily",
    "family",
    "subfamily",
    "supertribe",
    "tribe",
    "subtribe",
    "genus",
    "genushybrid",
    "species",
    "hybrid",
    "subspecies",
    "variety",
    "form"
  ) ),
  iconic_taxa: Joi.array( ).items( Joi.string( ).valid(
    "Actinopterygii",
    "Animalia",
    "Amphibia",
    "Arachnida",
    "Aves",
    "Chromista",
    "Fungi",
    "Insecta",
    "Mammalia",
    "Mollusca",
    "Reptilia",
    "Plantae",
    "Protozoa",
    "unknown"
  ) ),
  id_above: Joi.number( ).integer( ),
  id_below: Joi.number( ).integer( ),
  identifications: Joi.string( ).valid(
    "most_agree",
    "most_disagree",
    "some_agree"
  ),
  lat: Joi.number( ).integer( ).min( -90 ).max( 90 ),
  lng: Joi.number( ).integer( ).min( -180 ).max( 180 ),
  radius: Joi.number( ).integer( ),
  nelat: Joi.number( ).integer( ).min( -90 ).max( 90 ),
  nelng: Joi.number( ).integer( ).min( -180 ).max( 180 ),
  swlat: Joi.number( ).integer( ).min( -90 ).max( 90 ),
  swlng: Joi.number( ).integer( ).min( -180 ).max( 180 ),
  list_id: Joi.number( ).integer( ),
  not_in_project: Joi.array( ).items( Joi.string( ) ),
  not_matching_project_rules_for: Joi.string( ),
  q: Joi.string( ),
  search_on: Joi.string( ).valid(
    "names",
    "tags",
    "description",
    "place"
  ),
  quality_grade: Joi.array( ).items( Joi.string( ).valid(
    "casual",
    "needs_id",
    "research"
  ) ),
  updated_since: Joi.string( ),
  viewer_id: Joi.number( ).integer( ),
  reviewed: Joi.boolean( ),
  locale: Joi.string( ),
  preferred_place_id: Joi.number( ).integer( ),
  ttl: Joi.number( ).integer( ),
  page: Joi.number( ).integer( ),
  per_page: Joi.number( ).integer( ),
  order: Joi.string( ).valid(
    "desc",
    "asc"
  ),
  order_by: Joi.string( ).valid(
    "observed_on",
    "species_guess",
    "votes",
    "id",
    "created_at"
  ),
  only_id: Joi.boolean( ),
  fields: Joi.any( )
    .description( "Attribute fields to return in the response" )
    .example( "species_guess,observed_on" )
} ).unknown( false );