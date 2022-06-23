// first draw an aoi using the tools in the map window

// Now select your image type!

var collection = ee
  .ImageCollection("ASTER/AST_L1T_003") // searches all sentinel 2 imagery pixels...
  //.filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10)) // ...filters on the metadata for pixels less than 10% cloud
  .filterDate("2007-06-01", "2007-09-30") //... chooses only pixels between the dates you define here
  .filterMetadata("CLOUDCOVER", "less_than", 20)
  .filterBounds(geometry); // ... that are within your aoi

print(collection); // this generates a JSON list of the images (and their metadata) which the filters found in the right-hand window.

/// so far this is finding all the images in the collection which meets the critera- the latest on top. To get a nice blended-looking mosaic,
// try some of the tools for 'reducing' these to one pixel (or bands of pixels in a layer stack).

var medianpixels = collection.median(); // This finds the median value of all the pixels which meet the criteria.

var medianpixelsclipped = medianpixels.clip(geometry).divide(10000); // this cuts up the result so that it fits neatly into your aoi
// and divides so that values between 0 and 1

// Now visualise the mosaic as a natural colour image.
Map.addLayer(
  medianpixelsclipped,
  {
    bands: [
      "B14",
      "B13",
      "B12",
      "B11",
      "B10",
      "B09",
      "B08",
      "B07",
      "B06",
      "B05",
      "B04",
      "B3N",
      "B02",
      "B01",
    ],
    min: 0,
    max: 1,
    gamma: 1.5,
  },
  "ASTER_L1T"
);

// export it to your googledrive as a tiff for use in QGIS
// Export the image, specifying scale and region.
Export.image.toDrive({
  image: medianpixelsclipped.select("B3N", "B02", "B01"),
  description: "AST_L1T_Mosaic",
  scale: 30,
  maxPixels: 1e9,
  region: geometry,
});
