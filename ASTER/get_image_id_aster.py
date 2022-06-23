# GitHub URL: https://github.com/giswqs/qgis-earthengine-examples/tree/master/Image/get_image_id.py

# GitHub URL: https:#github.com/giswqs/qgis-earthengine-examples/tree/master/ImageCollection/sort_by_cloud_and_date.py

import ee
from ee_plugin import Map

# This function masks the input with a threshold on the simple cloud score.

# Load a ASTER image collection.
collection = ee.ImageCollection('ASTER/AST_L1T_003') \
    .filter(ee.Filter.date('2000-01-01', '2008-03-30')) \
    .filterMetadata('CLOUDCOVER', 'less_than', 20) \
    .filterBounds(ee.Geometry.Point(153.5585,59.2852)) \
    .select(['B3N', 'B02', 'B01']) \
    .sort('system:time_start', True)  # Sort the collection in chronological order.

print(collection.size().getInfo())

first = collection.first()
propertyNames = first.propertyNames()
print(propertyNames.getInfo())

uid = first.get('system:id')
print(uid.getInfo())

vizParams = {
    'gamma': [1.4],
    'bands': ['B3N', 'B02', 'B01'],
}

Map.setCenter(153.5585,59.2852, 10);
Map.addLayer(first, vizParams, 'ASTER_L1T');