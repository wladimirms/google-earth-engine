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
var image = ee
  .Image("LANDSAT/LC8_L1T/LC80440342014077LGN00")
  .select(["B2", "B3", "B4", "B5", "B6", "B7", "B10", "B11"]);

// Display the input imagery and the region in which to do the PCA.
var region = image.geometry();
Map.centerObject(region, 10);
Map.addLayer(ee.Image().paint(region, 0, 2), {}, "Region");
Map.addLayer(
  image,
  { bands: ["B4", "B3", "B2"], min: 0, max: 20000 },
  "Original Image"
);

// Set some information about the input to be used later.
var scale = 30;
var bandNames = image.bandNames();

// Mean center the data to enable a faster covariance reducer
// and an SD stretch of the principal components.
var meanDict = image.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: region,
  scale: scale,
  maxPixels: 1e9,
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
    maxPixels: 1e9,
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

// Get the PCs at the specified scale and in the specified region
var pcImage = getPrincipalComponents(centered, scale, region);

// Plot each PC as a new layer
/* for (var i = 0; i < bandNames.length().getInfo(); i++) {
  var band = pcImage.bandNames().get(i).getInfo();
  Map.addLayer(pcImage.select([band]), {min: -2, max: 2}, band);
} */

var rgb = [0, 1, 2];
Map.addLayer(pcImage.select(rgb), { min: -100, max: 4000, stretch: 1 }, "PCA");

Map.addLayer(dcs(image, region, 1000).select(rgb), {}, "DCS Image");
