# GitHub URL: https://github.com/giswqs/qgis-earthengine-examples/tree/master/Image/get_image_id.py

# GitHub URL: https:#github.com/giswqs/qgis-earthengine-examples/tree/master/ImageCollection/sort_by_cloud_and_date.py

import ee
from ee_plugin import Map

# This function masks the input with a threshold on the simple cloud score.

# Load a Landsat 8 image collection.
collection = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR') \
    .filterDate('2019-07-01', '2019-07-30') \
    .filter(ee.Filter.lte('CLOUD_COVER', 10)) \
    .filterBounds(ee.Geometry.Point(153.5585,59.2852)) \
    .select(['B4', 'B3', 'B2']) \
    .sort('system:time_start', True)  # Sort the collection in chronological order.

print(collection.size().getInfo())

first = collection.first()
propertyNames = first.propertyNames()
print(propertyNames.getInfo())

uid = first.get('system:id')
print(uid.getInfo())

vizParams = {
  'bands': ['B4', 'B3', 'B2'],
  'gamma': [1, 1, 1]
}

Map.setCenter(153.5585,59.2852, 10);
Map.addLayer(first, vizParams, 'LC08_SR');