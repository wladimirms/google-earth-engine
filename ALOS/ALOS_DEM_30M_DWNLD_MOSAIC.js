// first draw an aoi using the tools in the map window

// Now select your image type!

var dataset = ee.Image("JAXA/ALOS/AW3D30/V2_2");
var elevation = dataset.select("AVE_DSM");
var elevationVis = {
  min: -9999,
  max: 15355,
  palette: ["0000ff", "00ffff", "ffff00", "ff0000", "ffffff"],
};

print(dataset); // this generates a JSON list of the images (and their metadata) which the filters found in the right-hand window.

/// so far this is finding all the images in the collection which meets the critera- the latest on top. To get a nice blended-looking mosaic,
// try some of the tools for 'reducing' these to one pixel (or bands of pixels in a layer stack).

//var medianpixels = elevation.median() // This finds the median value of all the pixels which meet the criteria.

var pixelsclipped = elevation.clip(geometry); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1

// Now visualise the mosaic as a natural colour image.
Map.addLayer(pixelsclipped, elevationVis, "Elevation");

// export it to your googledrive as a tiff for use in QGIS
// Export the image, specifying scale and region.
Export.image.toDrive({
  image: pixelsclipped.float(),
  description: "ALOS_DEM_Mosaic",
  scale: 30,
  maxPixels: 5000000000000,
  region: geometry,
});
