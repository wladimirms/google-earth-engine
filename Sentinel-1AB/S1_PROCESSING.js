// Load the Sentinel-1 ImageCollection.
var sentinel1 = ee.ImageCollection("COPERNICUS/S1_GRD");

// Filter by metadata properties.
var vh = sentinel1
  // Filter to get images with VV and VH dual polarization.
  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
  // Filter to get images collected in interferometric wide swath mode.
  .filter(ee.Filter.eq("instrumentMode", "IW"));

// Filter to get images from different look angles.
var vhAscending = vh.filter(ee.Filter.eq("orbitProperties_pass", "ASCENDING"));
var vhDescending = vh.filter(
  ee.Filter.eq("orbitProperties_pass", "DESCENDING")
);

// Create a composite from means at different polarizations and look angles.
var composite = ee.Image.cat([
  vhAscending.select("VH").mean(),
  ee
    .ImageCollection(vhAscending.select("VV").merge(vhDescending.select("VV")))
    .mean(),
  vhDescending.select("VH").mean(),
]).focal_median();

// Display as a composite of polarization and backscattering characteristics.
Map.addLayer(composite, { min: [-25, -20, -25], max: [0, 10, 0] }, "composite");

//print(dataset) // this generates a JSON list of the images (and their metadata) which the filters found in the right-hand window.

/// so far this is finding all the images in the collection which meets the critera- the latest on top. To get a nice blended-looking mosaic,
// try some of the tools for 'reducing' these to one pixel (or bands of pixels in a layer stack).

//var medianpixels = elevation.median() // This finds the median value of all the pixels which meet the criteria.

var sarclipped = composite.clip(geometry).divide(10000); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1

// Now visualise the mosaic as a natural colour image.
//Map.addLayer(pixelsclipped, elevationVis, 'Elevation')

// export it to your googledrive as a tiff for use in QGIS
// Export the image, specifying scale and region.
Export.image.toDrive({
  image: sarclipped.float(),
  description: "S1_SAR",
  scale: 5,
  maxPixels: 5000000000000,
  region: geometry,
});
