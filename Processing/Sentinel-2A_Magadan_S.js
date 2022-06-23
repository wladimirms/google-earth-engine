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

var alos = ee.Image("JAXA/ALOS/AW3D30/V2_2");
var elevation = alos.select("AVE_DSM");

var aspect = ee.Terrain.aspect(elevation);

var sinImage = aspect.divide(180).multiply(Math.PI).sin();

/// so far this is finding all the images in the collection which meets the critera- the latest on top. To get a nice blended-looking mosaic,
// try some of the tools for 'reducing' these to one pixel (or bands of pixels in a layer stack).

//var medianpixels = elevation.median() // This finds the median value of all the pixels which meet the criteria.

var pixelsclipped = sinImage.clip(geometry).divide(10000); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1

// Now visualise the mosaic as a natural colour image.
Map.addLayer(pixelsclipped, VisALOS, "ALOS_DSM");

var dataset = ee.Image("JAXA/ALOS/AW3D30/V2_2");
var elevation = dataset.select("AVE_DSM");
print(dataset); // this generates a JSON list of the images (and their metadata) which the filters found in the right-hand window.

/// so far this is finding all the images in the collection which meets the critera- the latest on top. To get a nice blended-looking mosaic,
// try some of the tools for 'reducing' these to one pixel (or bands of pixels in a layer stack).

//var medianpixels = elevation.median() // This finds the median value of all the pixels which meet the criteria.

var pixelsclipped = elevation.clip(geometry).divide(10000); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1

// Now visualise the mosaic as a natural colour image.
Map.addLayer(pixelsclipped, Elev, "Elevation");

var imgVV = ee
  .ImageCollection("COPERNICUS/S1_GRD")
  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
  .filter(ee.Filter.eq("instrumentMode", "IW"))
  .select("VV")
  .map(function (image) {
    var edge = image.lt(-30.0);
    var maskedImage = image.mask().and(edge.not());
    return image.updateMask(maskedImage);
  });

var desc = imgVV.filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING"));
var asc = imgVV.filter(ee.Filter.eq("orbitProperties_pass", "ASCENDING"));

var spring = ee.Filter.date("2019-03-01", "2019-04-20");
var lateSpring = ee.Filter.date("2019-04-21", "2019-06-10");
var summer = ee.Filter.date("2019-06-11", "2019-08-31");

var descChange = ee.Image.cat(
  desc.filter(spring).mean(),
  desc.filter(lateSpring).mean(),
  desc.filter(summer).mean()
);

var ascChange = ee.Image.cat(
  asc.filter(spring).mean(),
  asc.filter(lateSpring).mean(),
  asc.filter(summer).mean()
);

Map.setCenter(153.5585, 59.2852, 10);
//Map.addLayer(ascChange, {min: -25, max: 5}, 'Multi-T Mean ASC', true);
//Map.addLayer(descChange, {min: -25, max: 5}, 'Multi-T Mean DESC', true);

//var table = ee.FeatureCollection("users/muravevtsnigri/Num_Magadan_GEE");

var sarascclipped = ascChange.clip(geometry).divide(10000); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1
var sardescclipped = descChange.clip(geometry).divide(10000); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1
//Map.addLayer(sarascclipped, {min: -25, max: 5}, 'Multi-T Mean ASC', true);
Map.addLayer(sardescclipped, VisGRD, "Multi-T Mean DESC", true);

/**
 * Compute the Principal Components of a Landsat 8 image.
 */

// Load a landsat 8 image, select the bands of interest.
var granule = ee
  .Image("COPERNICUS/S2_SR/20190818T011659_20190818T011658_T57WVN")
  .select([
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
    "B6",
    "B7",
    "B8",
    "B8A",
    "B9",
    "B11",
    "B12",
  ]);

//var geometry = ee.FeatureCollection("users/muravevtsnigri/Num_Magadan_GEE");
// first draw an aoi using the tools in the map window

// Now select your image type!

/*var collection = ee.ImageCollection('COPERNICUS/S2_SR') // searches all sentinel 2 imagery pixels...
  //.filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10)) // ...filters on the metadata for pixels less than 10% cloud
  .filterDate('2019-07-01' ,'2019-07-30') //... chooses only pixels between the dates you define here
  .filterBounds(geometry) // ... that are within your aoi
  .select(['B1', 'B2', 'B3', 'B4', 'B5', 'B8', 'B11', 'B12'])*/

print(granule); // this generates a JSON list of the images (and their metadata) which the filters found in the right-hand window.

/// so far this is finding all the images in the collection which meets the critera- the latest on top. To get a nice blended-looking mosaic,
// try some of the tools for 'reducing' these to one pixel (or bands of pixels in a layer stack).

//var medianpixels = granule.median() // This finds the median value of all the pixels which meet the criteria.

var image = granule.clip(geometry).divide(10000); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1

// Now visualise the mosaic as a natural colour image.
//Map.addLayer(image, {bands: ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B10', 'B11', 'B12'], min: 0, max: 1, gamma: 1.5}, 'Sentinel_2 mosaic')

// Display the input imagery and the region in which to do the PCA.
var region = image.geometry();
Map.centerObject(region, 10);
//Map.addLayer(ee.Image().paint(region, 0, 2), {}, 'Region');
Map.addLayer(image, VisOriginal, "Original Image");

// Set some information about the input to be used later.
var scale = 10;
var bandNames = image.bandNames();

// Mean center the data to enable a faster covariance reducer
// and an SD stretch of the principal components.
var meanDict = image.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: region,
  scale: scale,
  maxPixels: 50000000000000,
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

// Compute the Normalized Difference Vegetation Index (NDVI).
var nir = image.select("B8");
var red = image.select("B4");
var ndvi = nir.subtract(red).divide(nir.add(red)).rename("NDVI");

// Display the result.
Map.centerObject(image, 9);
//var ndviParams = {min: -1, max: 1, palette: ['blue', 'white', 'green']};
Map.addLayer(ndvi, VisNDVI, "NDVI image");

// Get the PCs at the specified scale and in the specified region
var pcImage = getPrincipalComponents(centered, scale, region);

// Plot each PC as a new layer
/* for (var i = 0; i < bandNames.length().getInfo(); i++) {
  var band = pcImage.bandNames().get(i).getInfo();
  Map.addLayer(pcImage.select([band]), {min: -2, max: 2}, band);
} */

//PCA
var rgbpca = [1, 2, 3];
Map.addLayer(pcImage.select(rgbpca), VisPCA, "PCA");

//DCS
var rgbdcs = [3, 2, 1];
Map.addLayer(dcs(image, region, 1000).select(rgbdcs), VisDCS, "DCS Image");

//Composite
//var compositegeo = [11, 10, 1]
//Map.addLayer(image.select(compositegeo), {min: -100, max: 4000, stretch: 1,}, 'SWIR');

Map.addLayer(geometry2, { color: "white", fill: "transparent" }, "License");

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

// Or if you prefer, you can pass a dictionary into expression():
var b2 = image.select("B2");
var b3 = image.select("B3");
var b4 = image.select("B4");
var b5 = image.select("B5");
var b6 = image.select("B6");
var b7 = image.select("B7");
var b8 = image.select("B8");
var b8 = image.select("B8A");
var b9 = image.select("B9");
var b10 = image.select("B10");
var b11 = image.select("B11");
var b12 = image.select("B12");

var alterationLaterite = b11.divide(b12);
var fe2 = b12.divide(b8).add(b3.divide(b4));
var fe3 = b4.divide(b3);
var ferricOxides = b11.divide(b8);
var silicates = b12.divide(b11);
var allIron = b4.divide(b2);
var hydroBearing = b11.divide(b12);
var ferrousOxides = b4.divide(b11);

//Map.addLayer(alterationLaterite, {min:0, max:6}, 'Alt/Laterite');
//Map.addLayer(fe2, {min:0, max:6}, 'Fe2+');
//Map.addLayer(fe3, {min:0, max:6}, 'Fe3+');
//Map.addLayer(ferricOxides, {min:0, max:6}, 'Fe Oxides');
//Map.addLayer(silicates, {min:0, max:6}, 'Silicates');
//Map.addLayer(allIron, {min:0, max:6}, 'allIron');
//Map.addLayer(hydroBearing, {min:0, max:6}, 'hydroBearing');
//Map.addLayer(ferrousOxides, {min:0, max:6}, 'ferrousOxides');

//Map.addLayer(rgbratio.select(rgb), {min:0, max:6}, 'Ratio');

/*Export.image.toDrive({
    image: image.select(rgbdcs),
    description: 'Natural Color',
    region: geometry,
    maxPixels: 10000000000000,
   });

Export.image.toDrive({
    image: pcImage.select(rgbpca),
    description: 'PCA',
    scale: 10,
    region: geometry,
    maxPixels: 10000000000000,
   });

Export.image.toDrive({
    image: dcs(image, geometry).select(rgbdcs),
    description: 'DCS',
    scale: 10,
    region: geometry,
    maxPixels: 10000000000000,
   });

Export.image.toDrive({
    image: ndvi,
    description: 'NDVI',
    scale: 20,
    region: geometry,
    maxPixels: 5000000000000,
   });

Export.image.toDrive({
 image: alterationLaterite,
 description: 'alterationLaterite',
 scale: 20,
 region: geometry,
 maxPixels: 1e9,
});

Export.image.toDrive({
 image: fe2,
 description: 'fe2',
 scale: 20,
 region: geometry,
 maxPixels: 1e9,
});

Export.image.toDrive({
 image: fe3,
 description: 'fe3',
 scale: 20,
 region: geometry,
 maxPixels: 1e9,
});

Export.image.toDrive({
 image: ferricOxides,
 description: 'ferricOxides',
 scale: 20,
 region: geometry,
 maxPixels: 1e9,
});

Export.image.toDrive({
 image: silicates,
 description: 'silicates',
 scale: 20,
 region: geometry,
 maxPixels: 1e9,
});

Export.image.toDrive({
 image: allIron,
 description: 'allIron',
 scale: 20,
 region: geometry,
 maxPixels: 1e9,
});

Export.image.toDrive({
 image: hydroBearing,
 description: 'hydroBearing',
 scale: 20,
 region: geometry,
 maxPixels: 1e9,
});

Export.image.toDrive({
 image: ferrousOxides,
 description: 'ferrousOxides',
 scale: 20,
 region: geometry,
 maxPixels: 1e9,
});*/
