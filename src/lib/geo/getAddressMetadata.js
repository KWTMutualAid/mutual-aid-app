const { Client } = require("@googlemaps/google-maps-services-js");
const gju = require("geojson-utils");
const Geonames = require("geonames.js");
const boundsJson = require("~assets/crownheights.json");

const googleGeoClient = new Client({});
const geonamesClient = new Geonames({
  username: process.env.GEONAME_CLIENT_ID || "demo",
  lan: "en",
  encoding: "JSON"
});

module.exports = async function getAddressMetadata(address) {
  const bkAddress = `${address} Brooklyn`;
  const geoResult = await googleGeoClient.geocode({
    params: {
      address: bkAddress,
      region: "us",
      components: {
        locality: "New York City",
        sublocality: "Brooklyn"
      },
      key: process.env.GOOGLE_MAPS_API_KEY
    },
    timeout: 1000 // milliseconds
  });
  const geoResults = geoResult.data.results;

  const locResult = geoResults[0];
  const {
    geometry: { location }
  } = locResult;

  const neighborhood = locResult.address_components.find(component =>
    component.types.includes("neighborhood")
  );

  const neighborhoodName = neighborhood ? neighborhood.long_name : "";

  const [lt, long] = [location.lat, location.lng];

  const intersection = await geonamesClient.findNearestIntersection({
    lat: lt,
    lng: long
  });
  const userQuadrant = boundsJson.features.find(quadrant =>
    gju.pointInPolygon(
      { type: "Point", coordinates: [long, lt] },
      quadrant.geometry
    )
  );
  const quadrantName = userQuadrant ? userQuadrant.properties.id : null;

  return {
    neighborhoodName,
    location,
    intersection: {
      street_1: intersection.intersection.street1,
      street_2: intersection.intersection.street2
    },
    quadrant: quadrantName
  };
};
