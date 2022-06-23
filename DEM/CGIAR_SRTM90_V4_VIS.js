var dataset = ee.Image("CGIAR/SRTM90_V4");
var elevation = dataset.select("elevation");
var slope = ee.Terrain.slope(elevation);
Map.setCenter(37.6394463953768, 55.722760017572405, 12);
Map.addLayer(slope, { min: 0, max: 60, gamma: 3 }, "slope");
