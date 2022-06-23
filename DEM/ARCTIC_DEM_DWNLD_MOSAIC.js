// first draw an aoi using the tools in the map window

// Now select your image type!

var collection = ee.ImageCollection("UMN/PGC/ArcticDEM/V3/2m"); // searches all sentinel 2 imagery pixels...
var elevation = collection.select("elevation");
var elevationVis = {
  min: -50.0,
  max: 1000.0,
  palette: ["black", "60e1ff", "ffffff"],
};

print(collection); // this generates a JSON list of the images (and their metadata) which the filters found in the right-hand window.

/// so far this is finding all the images in the collection which meets the critera- the latest on top. To get a nice blended-looking mosaic,
// try some of the tools for 'reducing' these to one pixel (or bands of pixels in a layer stack).

var medianpixels = elevation.median(); // This finds the median value of all the pixels which meet the criteria.

var medianpixelsclipped = medianpixels.clip(geometry); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1

// Now visualise the mosaic as a natural colour image.
Map.addLayer(medianpixelsclipped, elevationVis, "Elevation");

// export it to your googledrive as a tiff for use in QGIS
// Export the image, specifying scale and region.
Export.image.toDrive({
  image: medianpixelsclipped.float(),
  description: "Arctic_DEM_Mosaic",
  scale: 2,
  maxPixels: 5000000000000,
  region: geometry,
});
