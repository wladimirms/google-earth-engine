# GitHub URL: https://github.com/giswqs/qgis-earthengine-examples/tree/master/Image/get_image_id.py

# GitHub URL: https:#github.com/giswqs/qgis-earthengine-examples/tree/master/ImageCollection/sort_by_cloud_and_date.py

import ee
from ee_plugin import Map

# This function masks the input with a threshold on the simple cloud score.

# Load a Sentinel 1 image collection.
collection = ee.ImageCollection('COPERNICUS/S1_GRD') \
    .filterDate('2019-07-01', '2019-07-20') \
    .filterBounds(ee.Geometry.Point(153.5585,59.2852)) \
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
    .filter(ee.Filter.eq('instrumentMode', 'IW')) \
    .select('VV') \
    .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING')) \
    .sort('system:time_start', True)  # Sort the collection in chronological order.

print(collection.size().getInfo())

first = collection.first()
propertyNames = first.propertyNames()
print(propertyNames.getInfo())

uid = first.get('system:id')
print(uid.getInfo())

vizParams = {
    'gamma': [2.0],
    'min': [-25],
    'max': [5],
    'bands': ['VV'],
}

Map.setCenter(153.5585,59.2852, 10);
Map.addLayer(first, vizParams, 'S1_GRD');