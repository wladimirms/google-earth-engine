var dataset = ee.ImageCollection("UMN/PGC/ArcticDEM/V3/2m");
var elevation = dataset.select("elevation");
var elevationVis = {
  min: -50.0,
  max: 1000.0,
  palette: ["black", "60e1ff", "ffffff"],
};
Map.setCenter(29.1984203640408, 61.84343456000074, 7);
Map.addLayer(elevation, elevationVis, "Elevation");
