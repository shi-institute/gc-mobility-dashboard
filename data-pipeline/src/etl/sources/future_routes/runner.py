

from pathlib import Path

from etl.sources.future_routes.etl import FutureRoutesETL

after = ['replica', 'greenlink_gtfs']


def source_runner():
    areas_folder = Path('./input/replica_interest_area_polygons')
    areas_geojson_paths = [file for file in areas_folder.glob(
        '*.geojson') if file.name != 'full_area.geojson']

    FutureRoutesETL(areas_geojson_paths).run()
