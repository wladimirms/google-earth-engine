/**
 * Function to mask clouds based on the pixel_qa band of Landsat 8 SR data.
 * @param {ee.Image} image input Landsat 8 SR image
 * @return {ee.Image} cloudmasked Landsat 8 image
 */
function maskL8sr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 5;
  // Get the pixel QA band.
  var qa = image.select("pixel_qa");
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa
    .bitwiseAnd(cloudShadowBitMask)
    .eq(0)
    .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
}

var dataset = ee
  .ImageCollection("LANDSAT/LC08/C01/T1_SR")
  .filterDate("2019-05-01", "2019-09-30")
  .map(maskL8sr);

var visParams = {
  bands: ["B4", "B3", "B2"],
  min: 0,
  max: 3000,
  gamma: 1.4,
};
Map.setCenter(37.6216480464954, 55.75479862400161, 12);
Map.addLayer(dataset.median(), visParams);
