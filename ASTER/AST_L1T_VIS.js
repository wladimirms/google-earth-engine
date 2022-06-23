var dataset = ee
  .ImageCollection("ASTER/AST_L1T_003")
  .filter(ee.Filter.date("2000-01-01", "2008-03-30"))
  .filterMetadata("CLOUDCOVER", "less_than", 20);
var falseColor = dataset.select(["B3N", "B02", "B01"]);
var falseColorVis = {
  min: 0.0,
  max: 255.0,
  gamma: 1.4,
};
Map.setCenter(37.618558141710245, 55.754508822971026, 11);
Map.addLayer(falseColor.median(), falseColorVis, "False Color");
