/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
function maskS2clouds(image) {
  var qa = image.select("QA60");

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa
    .bitwiseAnd(cloudBitMask)
    .eq(0)
    .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

// Map the function over one year of data and take the median.
// Load Sentinel-2 TOA reflectance data.
var dataset = ee
  .ImageCollection("COPERNICUS/S2_SR")
  .filterDate("2019-05-01", "2019-09-30")
  // Pre-filter to get less cloudy granules.
  .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
  .map(maskS2clouds);

var rgbVis = {
  min: 0.0,
  max: 0.3,
  gamma: 1,
  bands: ["B4", "B3", "B2"],
};

Map.setCenter(37.62365280139242, 55.7532601789429, 12);
Map.addLayer(dataset.median(), rgbVis, "RGB");
