function dcs(image, region, scale) {
  var bandNames = image.bandNames();

  // The axes are numbered, so to make the following code more
  // readable, give the axes names.
  var imageAxis = 0;
  var bandAxis = 1;

  // Compute the mean of each band in the region.
  var means = image.reduceRegion(ee.Reducer.mean(), region, scale);

  // Create a constant array image from the mean of each band.
  var meansArray = ee.Image(means.toArray());

  // Collapse the bands of the image into a 1D array per pixel,
  // with images along the first axis and bands along the second.
  var arrays = image.toArray();

  // Perform element-by-element subtraction, which centers the
  // distribution of each band within the region.
  var centered = arrays.subtract(meansArray);

  // Compute the covariance of the bands within the region.
  var covar = centered.reduceRegion({
    reducer: ee.Reducer.centeredCovariance(),
    geometry: region,
    scale: scale,
  });

  // Get the 'array' result and cast to an array. Note this is a
  // single array, not one array per pixel, and represents the
  // band-to-band covariance within the region.
  var covarArray = ee.Array(covar.get("array"));

  // Perform an eigen analysis and slice apart the values and vectors.
  var eigens = covarArray.eigen();
  var eigenValues = eigens.slice(bandAxis, 0, 1);
  var eigenVectors = eigens.slice(bandAxis, 1);

  // Rotate by the eigenvectors, scale to a variance of 30, and rotate back.
  var i = ee.Array.identity(bandNames.length());
  var variance = eigenValues.sqrt().matrixToDiag();
  var scaled = i.multiply(30).divide(variance);
  var rotation = eigenVectors
    .transpose()
    .matrixMultiply(scaled)
    .matrixMultiply(eigenVectors);

  // Reshape the 1-D 'normalized' array, so we can left matrix multiply
  // with the rotation. This requires embedding it in 2-D space and
  // transposing.
  var transposed = centered.arrayRepeat(bandAxis, 1).arrayTranspose();

  // Convert rotated results to 3 RGB bands, and shift the mean to 127.
  return transposed
    .matrixMultiply(ee.Image(rotation))
    .arrayProject([bandAxis])
    .arrayFlatten([bandNames])
    .add(127)
    .byte();
}

/**
 * Compute the Principal Components of a Landsat 8 image.
 */

// Load a landsat 8 image, select the bands of interest.
var granule = ee
  .Image("ASTER/AST_L1T_003/20000925011639")
  .select([
    "B01",
    "B02",
    "B3N",
    "B04",
    "B05",
    "B06",
    "B07",
    "B08",
    "B09",
    "B10",
    "B11",
    "B12",
  ]);

var geometry = ee.FeatureCollection("users/muravevtsnigri/ASTER_SHKIP");
// first draw an aoi using the tools in the map window

// Now select your image type!

/*var collection = ee.ImageCollection('ASTER/AST_L1T_003') // searches all sentinel 2 imagery pixels...
  //.filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10)) // ...filters on the metadata for pixels less than 10% cloud
  .filterDate('2000-05-01' ,'2000-09-30') //... chooses only pixels between the dates you define here
  .filterMetadata('CLOUDCOVER', 'less_than', 20)
  .filterBounds(geometry) // ... that are within your aoi
  .select(['B01', 'B02', 'B3N', 'B04', 'B05', 'B08', 'B11', 'B12'])
*/
print(granule); // this generates a JSON list of the images (and their metadata) which the filters found in the right-hand window.

/// so far this is finding all the images in the collection which meets the critera- the latest on top. To get a nice blended-looking mosaic,
// try some of the tools for 'reducing' these to one pixel (or bands of pixels in a layer stack).

//var medianpixels = collection.median() // This finds the median value of all the pixels which meet the criteria.

var image = granule.clip(geometry).divide(10000); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1

// Now visualise the mosaic as a natural colour image.
//Map.addLayer(image, {bands: ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B10', 'B11', 'B12'], min: 0, max: 1, gamma: 1.5}, 'Sentinel_2 mosaic')

// Display the input imagery and the region in which to do the PCA.
var region = image.geometry();
Map.centerObject(region, 10);
Map.addLayer(ee.Image().paint(region, 0, 2), {}, "Region");
Map.addLayer(
  image,
  { bands: ["B3N", "B02", "B01"], min: 0, max: 20000 },
  "Original Image"
);

// Set some information about the input to be used later.
var scale = 15;
var bandNames = image.bandNames();

// Mean center the data to enable a faster covariance reducer
// and an SD stretch of the principal components.
var meanDict = image.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: region,
  scale: scale,
  maxPixels: 5000000000000,
});
var means = ee.Image.constant(meanDict.values(bandNames));
var centered = image.subtract(means);

// This helper function returns a list of new band names.
var getNewBandNames = function (prefix) {
  var seq = ee.List.sequence(1, bandNames.length());
  return seq.map(function (b) {
    return ee.String(prefix).cat(ee.Number(b).int());
  });
};

// This function accepts mean centered imagery, a scale and
// a region in which to perform the analysis.  It returns the
// Principal Components (PC) in the region as a new image.
var getPrincipalComponents = function (centered, scale, region) {
  // Collapse the bands of the image into a 1D array per pixel.
  var arrays = centered.toArray();

  // Compute the covariance of the bands within the region.
  var covar = arrays.reduceRegion({
    reducer: ee.Reducer.centeredCovariance(),
    geometry: region,
    scale: scale,
    maxPixels: 50000000000000,
  });

  // Get the 'array' covariance result and cast to an array.
  // This represents the band-to-band covariance within the region.
  var covarArray = ee.Array(covar.get("array"));

  // Perform an eigen analysis and slice apart the values and vectors.
  var eigens = covarArray.eigen();

  // This is a P-length vector of Eigenvalues.
  var eigenValues = eigens.slice(1, 0, 1);
  // This is a PxP matrix with eigenvectors in rows.
  var eigenVectors = eigens.slice(1, 1);

  // Convert the array image to 2D arrays for matrix computations.
  var arrayImage = arrays.toArray(1);

  // Left multiply the image array by the matrix of eigenvectors.
  var principalComponents = ee.Image(eigenVectors).matrixMultiply(arrayImage);

  // Turn the square roots of the Eigenvalues into a P-band image.
  var sdImage = ee
    .Image(eigenValues.sqrt())
    .arrayProject([0])
    .arrayFlatten([getNewBandNames("sd")]);

  // Turn the PCs into a P-band image, normalized by SD.
  return (
    principalComponents
      // Throw out an an unneeded dimension, [[]] -> [].
      .arrayProject([0])
      // Make the one band array image a multi-band image, [] -> image.
      .arrayFlatten([getNewBandNames("pc")])
      // Normalize the PCs by their SDs.
      .divide(sdImage)
  );
};

// Compute the Normalized Difference Vegetation Index (NDVI).
var nir = image.select("B08");
var red = image.select("B04");
var ndvi = nir.subtract(red).divide(nir.add(red)).rename("NDVI");

// Display the result.
Map.centerObject(image, 9);
var ndviParams = { min: -1, max: 1, palette: ["blue", "white", "green"] };
Map.addLayer(ndvi, ndviParams, "NDVI image");

// Get the PCs at the specified scale and in the specified region
var pcImage = getPrincipalComponents(centered, scale, region);

// Plot each PC as a new layer
/* for (var i = 0; i < bandNames.length().getInfo(); i++) {
  var band = pcImage.bandNames().get(i).getInfo();
  Map.addLayer(pcImage.select([band]), {min: -2, max: 2}, band);
} */

//PCA
var rgbpca = [0, 1, 2];
Map.addLayer(
  pcImage.select(rgbpca),
  { min: -100, max: 4000, stretch: 1 },
  "PCA"
);

//DCS
var rgbdcs = [3, 2, 1];
Map.addLayer(dcs(image, region, 1000).select(rgbdcs), {}, "DCS Image");

//ratios
/*
//Compute the ratio (B1 * B2) / (B3 * B4):
var ratio1 = l8.select('B1').multiply(l8.select('B2'))
  .divide(l8.select('B3').multiply(l8.select('B4')));
Map.addLayer(ratio1, {min:0, max:6}, 'ratio1');

// If that's hard to read, you can split it up like so:
var b1 = l8.select('B1');
var b2 = l8.select('B2');
var b3 = l8.select('B3');
var b4 = l8.select('B4');
var ratio2 = b1.multiply(b2).divide(b3.multiply(b4));
Map.addLayer(ratio2, {min:0, max:6}, 'ratio2');

// Or you can do it using expression(), picking out bands by name. 
var ratio3 = l8.expression('(b("B1")*b("B2"))/(b("B3")*b("B4"))');
Map.addLayer(ratio3, {min:0, max:6}, 'ratio3');*/

//15m resolution
var b01 = image.select("B01");
var b02 = image.select("B02");
var b3n = image.select("B3N");

//30m resolution
var b04 = image.select("B04");
var b05 = image.select("B05");
var b06 = image.select("B06");
var b07 = image.select("B07");
var b08 = image.select("B08");
var b09 = image.select("B09");

//90m resolution
var b10 = image.select("B10");
var b11 = image.select("B11");
var b12 = image.select("B12");
var b13 = image.select("B13");
var b14 = image.select("B14");

//Band Math
//15m resolution
var fe3 = b02.divide(b01); // Ferrous Iron

//30m resolution
var alterationLaterite = b04.divide(b05);
var akp = b04.add(b06).divide(b05); // Alunite, Kaolinite, Pyrophylite
var amphibole = b06.divide(b08);
var amphiboleMgОН = b06.add(b09).divide(b08);
var cce = b07.add(b09).divide(b08); // Carbonate, Chlorite, Epidote
var clay = b05.multiply(b07).divide(b06.multiply(b06));
var dolomite = b06.add(b08).divide(b07);
var eca = b06.add(b09).divide(b07.add(b08)); // Epidote, Chlorite, Amphibole
var fe2 = b05.divide(b3n).add(b01.divide(b02));
var ferricOxides = b04.divide(b3n);
var ferrousSilicates = b05.divide(b04);
var gossan = b04.divide(b02);
var hostRock = b05.divide(b06);
var kaolinitic = b07.divide(b05);
var muscovite = b07.divide(b06);
var phengitic = b05.divide(b06);
var smis = b05.add(b07).divide(b06);
var clayMinerals = b06.divide(b06);
var ferrousMinerals = b04.divide(b3n);

//90m resolution
var carbonate = b13.divide(b14);
var quartzRocks = b14.divide(b12); // Sericite, Muscovite, Illite, Smectite
var silica1 = b11.divide(b10);
var silica2 = b11.divide(b12);
var silica3 = b13.divide(b10);
var silica4 = b11.multiply(b11).divide(b10.divide(b12));
var siliceousRocks = b11.multiply(b11).divide(b10.multiply(b12)); // ?
var sio2 = b13.divide(b12);

/*
Map.addLayer(fe3, {min:0, max:6}, 'Fe3+');
Map.addLayer(alterationLaterite, {min:0, max:6}, 'Alt/Laterite');
Map.addLayer(amphibole, {min:0, max:6}, 'Amphibol');
Map.addLayer(amphiboleMgОН, {min:0, max:6}, 'Amphibole MgОН');
Map.addLayer(cce, {min:0, max:6}, 'Carbonate, Chlorite, Epidote');
Map.addLayer(clay, {min:0, max:6}, 'Clay');
Map.addLayer(dolomite, {min:0, max:6}, 'Dolomite');
Map.addLayer(eca, {min:0, max:6}, 'Epidote, Chlorite, Amphibole');
Map.addLayer(fe2, {min:0, max:6}, 'Fe2+');
Map.addLayer(ferricOxides, {min:0, max:6}, 'Ferric Oxides');
Map.addLayer(ferrousSilicates, {min:0, max:6}, 'Ferrous Silicates');
Map.addLayer(gossan, {min:0, max:6}, 'Gossan');
Map.addLayer(hostRock, {min:0, max:6}, 'Host Rock');
Map.addLayer(kaolinitic, {min:0, max:6}, 'Kaolinitic');
Map.addLayer(muscovite, {min:0, max:6}, 'Muscovite');
Map.addLayer(phengitic, {min:0, max:6}, 'Phengitic');
Map.addLayer(smis, {min:0, max:6}, 'Sericite, Muscovite, Illite, Smectite');
Map.addLayer(clayMinerals, {min:0, max:6}, 'Clay Minerals');
Map.addLayer(ferrousMinerals, {min:0, max:6}, 'Ferrous Minerals');
Map.addLayer(carbonate, {min:0, max:6}, 'Carbonate');
Map.addLayer(quartzRocks, {min:0, max:6}, 'Quartz Rich Rocks');
Map.addLayer(silica1, {min:0, max:6}, 'Silica 1');
Map.addLayer(silica2, {min:0, max:6}, 'Silica 2');
Map.addLayer(silica3, {min:0, max:6}, 'Silica 3');
Map.addLayer(silica4, {min:0, max:6}, 'Silica 4');
Map.addLayer(siliceousRocks, {min:0, max:6}, 'Siliceous Rocks');
Map.addLayer(sio2, {min:0, max:6}, 'Sio2 ');
*/

Export.image.toDrive({
  image: fe3,
  description: "Fe3+",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: alterationLaterite,
  description: "Alteration/Laterite",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: amphibole,
  description: "Amphibole",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: amphiboleMgОН,
  description: "Amphibole MgOH",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: cce,
  description: "Carbonate, Chlorite, Epidote",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: clay,
  description: "Clays",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: dolomite,
  description: "Dolomite",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: eca,
  description: "Epidote, Chlorite, Amphibole",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: fe2,
  description: "Fe2+",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: ferricOxides,
  description: "Ferric Oxides",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: ferrousSilicates,
  description: "Ferrous Silicates",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: gossan,
  description: "Gossan",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: hostRock,
  description: "Host Rocks",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: kaolinitic,
  description: "Kaolinitic",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: muscovite,
  description: "Muscovite",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: phengitic,
  description: "Phengitic",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: smis,
  description: "Sericite, Muscovite, Illite, Smectite",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: clayMinerals,
  description: "Clay Minerals",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: ferrousMinerals,
  description: "Ferrous Minerals",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: carbonate,
  description: "Carbonate",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: quartzRocks,
  description: "Quartz Rocks",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: silica1,
  description: "Silica 1",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: silica2,
  description: "Silica 2",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: silica3,
  description: "Silica 3",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: silica4,
  description: "Silica 4",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: siliceousRocks,
  description: "Siliceous Rocks",
  scale: 20,
  maxPixels: 1e9,
});

Export.image.toDrive({
  image: sio2,
  description: "Sio2",
  scale: 20,
  maxPixels: 1e9,
});
