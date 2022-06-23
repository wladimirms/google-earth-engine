var imgVV = ee
  .ImageCollection("COPERNICUS/S1_GRD")
  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
  .filter(ee.Filter.eq("instrumentMode", "IW"))
  .select("VV")
  .map(function (image) {
    var edge = image.lt(-30.0);
    var maskedImage = image.mask().and(edge.not());
    return image.updateMask(maskedImage);
  });

var desc = imgVV.filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING"));
var asc = imgVV.filter(ee.Filter.eq("orbitProperties_pass", "ASCENDING"));

var spring = ee.Filter.date("2015-03-01", "2015-04-20");
var lateSpring = ee.Filter.date("2015-04-21", "2015-06-10");
var summer = ee.Filter.date("2015-06-11", "2015-08-31");

var descChange = ee.Image.cat(
  desc.filter(spring).mean(),
  desc.filter(lateSpring).mean(),
  desc.filter(summer).mean()
);

var ascChange = ee.Image.cat(
  asc.filter(spring).mean(),
  asc.filter(lateSpring).mean(),
  asc.filter(summer).mean()
);

Map.setCenter(153.5585, 59.2852, 10);
//Map.addLayer(ascChange, {min: -25, max: 5}, 'Multi-T Mean ASC', true);
//Map.addLayer(descChange, {min: -25, max: 5}, 'Multi-T Mean DESC', true);

var table = ee.FeatureCollection("users/muravevtsnigri/Num_Magadan_GEE");

var sarascclipped = ascChange.clip(table).divide(10000); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1
var sardescclipped = descChange.clip(table).divide(10000); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1
Map.addLayer(sarascclipped, { min: -25, max: 5 }, "Multi-T Mean ASC", true);
Map.addLayer(sardescclipped, { min: -25, max: 5 }, "Multi-T Mean DESC", true);

// export it to your googledrive as a tiff for use in QGIS
// Export the image, specifying scale and region.
Export.image.toDrive({
  image: sarascclipped.float(),
  description: "S1_ASC",
  scale: 15,
  maxPixels: 5000000000000,
  region: table,
});

Export.image.toDrive({
  image: sardescclipped.float(),
  description: "S1_DESC",
  scale: 15,
  maxPixels: 5000000000000,
  region: table,
});
