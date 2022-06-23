// Create a geometry representing an export region.
var geometry = ee.Geometry.Polygon([
  [
    [37.53547403526493, 55.706674248206596],
    [37.71056863975712, 55.706674248206596],
    [37.71056863975712, 55.78242850268394],
    [37.53547403526493, 55.78242850268394],
  ],
]);

var landsat = ee
  .Image("LANDSAT/LC08/C01/T1_SR/LC08_123032_20140515")
  .select(["B4", "B3", "B2"]);

// Export the image, specifying scale and region.
Export.image.toDrive({
  image: landsat,
  description: "S2_SR",
  scale: 30,
  region: geometry,
});
