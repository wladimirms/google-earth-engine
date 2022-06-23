var dataset = ee
  .ImageCollection("EO1/HYPERION")
  .filter(ee.Filter.date("2000-10-19", "2019-03-01"));
var rgb = dataset.select(["B050", "B023", "B015"]);
var rgbVis = {
  min: 1000.0,
  max: 14000.0,
  gamma: 2.5,
};
Map.setCenter(129.4921888216219, 62.07876514911639, 9);
Map.addLayer(rgb.median(), rgbVis, "RGB");
