//var geometry = /* color: #d63000 */ee.Geometry.Polygon(
//    [[[-70.33198356628418, -16.667604212318242],
//      [-70.33138275146484, -16.64129056542051],
//      [-70.3795337677002, -16.641043857880046],
//      [-70.3795337677002, -16.668426455517558]]]);

var sentinel = ee
  .Image("COPERNICUS/S2_SR/20200826T005649_20200826T005648_T57VWK")
  .select(["B12", "B11", "B8", "B8A", "B7", "B6", "B5", "B4", "B3", "B2"]);

Export.image.toDrive({
  image: sentinel,
  description: "S2_SR",
  scale: 10,
  maxPixels: 5000000000000,
  // region: geometry
});
