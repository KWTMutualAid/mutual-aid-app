const getAddressMetadata = require("~lib/geo/getAddressMetadata");

exports.addressHandler = async (req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  if (!req.body.address) {
    return next("Must include 'address' in POST request.");
  }
  try {
    const addressMeta = await getAddressMetadata(req.body.address);
    return res.end(JSON.stringify(addressMeta));
  } catch (err) {
    console.log(err);
    return next("Address couldn't be found");
  }
};
