import os
from pathlib import Path

from etl.sources.greenlink_gtfs.etl import GreenlinkGtfsETL


def source_runner():
    transitland_api_key = os.getenv('TRANSITLAND_API_KEY', None)
    include_full_area_in_areas = os.getenv('INCLUDE_FULL_AREA_IN_AREAS', '0') == '1'

    areas_folder = Path('./input/replica_interest_area_polygons')
    areas_geojson_paths = [file for file in areas_folder.glob(
        '*.geojson') if file.name != 'full_area.geojson']
    if include_full_area_in_areas:
        areas_geojson_paths.append(areas_folder / 'full_area.geojson')

    GreenlinkGtfsETL(area_geojson_paths=areas_geojson_paths).run(transitland_api_key)
