import hashlib
import json
import logging
import os
import shutil
from pathlib import Path
from typing import Literal, Self, cast

import geopandas
import pandas
import requests
import tqdm

from etl.geodesic import geodesic_buffer_series
from etl.sources.census_acs_5year.constants import tiger_web_tracts_services
from etl.sources.replica.process_etl import Season
from etl.sources.replica.transformers.count_segment_frequency import \
    count_segment_frequency_multi_input

logger = logging.getLogger('future_routes_etl')
logger.setLevel(logging.DEBUG)


class FutureRoutesETL:
    """
    Processes future route.

    For the walk and bike service areas, it finds existing trips that could be
    replaced with public transit.

    All other expected GeoJSON inputs are transferred to the output folder
    for this ETL.
    """

    output_folder = Path('./data/future_routes')
    input_folder = Path('./input/future_routes')

    required_scenario_files = {
        'bikeshed': 'bikeshed.geojson',
        'paratransit': 'paratransit.geojson',
        'route': 'route.geojson',
        'stops': 'stops.geojson',
        'walkshed': 'walkshed.geojson',
    }

    replica_output_folder = Path('./data/replica')

    season: Season
    areas: list[tuple[Path, str]]

    data_geo_hash: str

    def __init__(self, area_geojson_paths: list[str] | list[Path]) -> None:
        # create output directories
        Path(self.output_folder).mkdir(parents=True, exist_ok=True)

        # construct a list of area paths and names
        area_geojson_paths = [Path(path) for path in area_geojson_paths]
        area_names = [os.path.splitext(path.name)[0] for path in area_geojson_paths]
        self.areas = list(zip(area_geojson_paths, area_names))

        # find the latest season
        season_paths = (self.replica_output_folder / 'full_area' /
                        'network_segments').glob('*.parquet')
        season_parts = [os.path.splitext(path.name)[0].split('_') for path in season_paths]
        seasons = [Season(region='_'.join(parts[0:-2]), year=int(parts[-2]), quarter=parts[-1])
                   for parts in season_parts]
        sorted_seasons = sorted(seasons, key=lambda s: (s['year'], s['quarter']), reverse=True)
        self.season = sorted_seasons[0]

        # find the matching overall service areas
        greenlink_gtfs_output_folder = Path(
            './data/greenlink_gtfs') / str(self.season['year']) / self.season['quarter']
        self.overall_walk_service_area_path = greenlink_gtfs_output_folder / 'walk_service_area.geojson'
        self.overall_bike_service_area_path = greenlink_gtfs_output_folder / 'bike_service_area.geojson'
        if not self.overall_walk_service_area_path.exists() or not self.overall_bike_service_area_path.exists():
            raise FileNotFoundError(
                f'Walk or bike service area files not found in {greenlink_gtfs_output_folder}. '
                'Please run the greenlink_gtfs ETL first.')

        # hash the full area geometry
        full_area_path = './input/replica_interest_area_polygons/full_area.geojson'
        full_area_geometry_to_hash = geopandas.read_file(full_area_path).geometry.union_all().wkb
        self.data_geo_hash = hashlib.md5(full_area_geometry_to_hash).hexdigest()

    def run(self) -> Self:
        scenarios = self.validate_scenarios()

        for scenario_folder in scenarios:
            logger.info(f'Processing scenario: {scenario_folder.name}')

            stats = {}

            # find convertable trips for the scenario
            stats['counts'] = self.find_convertable_trips(scenario_folder, day='thursday')

            # copy all input files to the output folder
            for file in scenario_folder.glob('*.geojson'):
                if file.name in self.required_scenario_files.values():
                    output_file_path = self.output_folder / scenario_folder.name / file.name
                    shutil.copy(file, output_file_path)
                    logger.info(f'Copied {file.name} to {output_file_path}')

            # save the stats to a JSON file
            output_stats_path = self.output_folder / scenario_folder.name / 'stats.json'
            output_stats_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_stats_path, 'w') as stats_file:
                json.dump(stats, stats_file, indent=2)
                logger.info(f'Saved stats to {output_stats_path}')

        return self

    def validate_scenarios(self) -> list[Path]:
        """
        Validates the scenarios by checking if the required files exist.

        Returns:
            A list of folder paths for each valid scenario.
        """
        valid_scenarios: list[Path] = []

        for scenario_folder in self.input_folder.iterdir():
            if scenario_folder.is_dir():
                scenario_files = list(scenario_folder.glob('*.geojson'))
                if scenario_files:
                    # ensure that every required file exists
                    for required_file in self.required_scenario_files.values():
                        if not any(file.name == required_file for file in scenario_files):
                            logger.warning(
                                f'Missing required file {required_file} in {scenario_folder.name}. Skipping this scenario.')
                            break
                    else:
                        # if all required files are present, add the scenario folder to the list
                        logger.info(f'Valid scenario found: {scenario_folder.name}')
                        valid_scenarios.append(scenario_folder)

                else:
                    logger.warning(
                        f'No GeoJSON files found in {scenario_folder.name}. Skipping this scenario.')
        return valid_scenarios

    def find_convertable_trips(self, scenario_input_folder: Path, day: Literal['saturday', 'thursday']) -> dict[str, int]:
        walk_service_area_path = scenario_input_folder / self.required_scenario_files['walkshed']
        bike_service_area_path = scenario_input_folder / self.required_scenario_files['bikeshed']
        season_str = f'{self.season['region']}_{self.season["year"]}_{self.season["quarter"]}'

        if not walk_service_area_path.exists() or not bike_service_area_path.exists():
            logger.warning(
                f'Missing walk or bike service area files in {scenario_input_folder.name}. Skipping trip conversion.')
            return {}

        scenario_route_walk_service_area = geopandas.read_file(
            walk_service_area_path, columns=['geometry'])
        overall_walk_service_area = geopandas.read_file(
            self.overall_walk_service_area_path, columns=['geometry'])
        walk_service_area = cast(geopandas.GeoDataFrame, pandas.concat(
            [scenario_route_walk_service_area, overall_walk_service_area]))
        # walk_service_area.geometry = geodesic_buffer_series(walk_service_area.geometry, 1000)

        scenario_bike_service_area = geopandas.read_file(
            bike_service_area_path, columns=['geometry'])
        overall_bike_service_area = geopandas.read_file(
            self.overall_bike_service_area_path, columns=['geometry'])
        bike_service_area = cast(geopandas.GeoDataFrame, pandas.concat(
            [scenario_bike_service_area, overall_bike_service_area]))

        trips_chunks_folder_path = self.replica_output_folder / 'full_area' / \
            f'{day}_trip' / '_chunks' / f'{season_str}_{day}_trip'
        chunk_paths = list(sorted(trips_chunks_folder_path.glob('*.parquet')))

        count_bar = tqdm.tqdm(
            desc=f'Counting convertable trips for {scenario_input_folder.name}',
            unit='step',
            leave=False,
            position=0,  # show above the other bar
            total=len(chunk_paths) * 3  # read, walk, bike
        )

        walk_sum = 0
        bike_sum = 0
        for chunk_index, chunk_path in enumerate(chunk_paths):
            area_convertable_df = pandas.read_parquet(
                chunk_path,
                columns=['activity_id', 'tour_type', 'mode', 'geometry',
                         'person_id', 'start_lat', 'start_lng', 'end_lat', 'end_lng'],
                filters=[('mode', '!=', 'PUBLIC_TRANSIT')],
            )
            count_bar.update(1)

            output_walk_convertable_trips_path = self.output_folder / \
                scenario_input_folder.name / 'walk_convertable_trips.geojson'
            output_bike_convertable_trips_path = self.output_folder / \
                scenario_input_folder.name / 'bike_convertable_trips.geojson'
            output_walk_convertable_trips_path.parent.mkdir(parents=True, exist_ok=True)
            output_bike_convertable_trips_path.parent.mkdir(parents=True, exist_ok=True)

            def count(scenario_route_service_area: geopandas.GeoDataFrame, full_network_service_area: geopandas.GeoDataFrame, output_file_path: Path) -> int:

                # get the trips that start in the new service area
                start_points = geopandas.points_from_xy(
                    area_convertable_df['start_lng'], area_convertable_df['start_lat'], crs='EPSG:4326')
                start_gdf = geopandas.GeoDataFrame(
                    area_convertable_df, geometry=start_points, crs='EPSG:4326')
                trips_starting_in_scenario_gdf = start_gdf[start_gdf.geometry.intersects(
                    scenario_route_service_area.union_all())]

                # filter the start trips to only include those that also end in the combined, full service area
                start_point_destinations = geopandas.points_from_xy(
                    trips_starting_in_scenario_gdf['end_lng'], trips_starting_in_scenario_gdf['end_lat'], crs='EPSG:4326')
                trips_starting_in_scenario_and_ending_in_whole_service_area_gdf = trips_starting_in_scenario_gdf[start_point_destinations.intersects(
                    full_network_service_area.union_all())]

                # get the trips that end in the new service area
                end_points = geopandas.points_from_xy(
                    area_convertable_df['end_lng'], area_convertable_df['end_lat'], crs='EPSG:4326')
                end_gdf = geopandas.GeoDataFrame(
                    area_convertable_df, geometry=end_points, crs='EPSG:4326')
                trips_ending_in_scenario_gdf = end_gdf[end_gdf.geometry.intersects(
                    scenario_route_service_area.union_all())]

                # filter the start trips to only include those that also start in the combined, full service area
                end_point_origins = geopandas.points_from_xy(
                    trips_ending_in_scenario_gdf['start_lng'], trips_ending_in_scenario_gdf['start_lat'], crs='EPSG:4326')
                trips_ending_in_scenario_and_starting_in_whole_service_area_gdf = trips_ending_in_scenario_gdf[end_point_origins.intersects(
                    full_network_service_area.union_all())]

                # get the union of the two sets of trips with duplicate activity_ids removed
                walk_convertable_gdf = cast(geopandas.GeoDataFrame, pandas.concat(
                    [trips_starting_in_scenario_and_ending_in_whole_service_area_gdf, trips_ending_in_scenario_and_starting_in_whole_service_area_gdf]).drop_duplicates(subset=['activity_id']))

                # save a copy of the walk convertable trips
                walk_convertable_gdf.to_file(
                    output_file_path, driver='GeoJSON', index=False, append=chunk_index > 0)

                del start_points
                del start_gdf
                del trips_starting_in_scenario_gdf
                del trips_starting_in_scenario_and_ending_in_whole_service_area_gdf

                del end_points
                del end_gdf
                del trips_ending_in_scenario_gdf
                del trips_ending_in_scenario_and_starting_in_whole_service_area_gdf

                count = len(walk_convertable_gdf)
                del walk_convertable_gdf

                return count

            walk_sum += count(
                scenario_route_walk_service_area,
                walk_service_area,
                output_walk_convertable_trips_path)
            count_bar.update(1)

            bike_sum += count(
                scenario_bike_service_area,
                bike_service_area,
                output_bike_convertable_trips_path)
            count_bar.update(1)

            del area_convertable_df

        count_bar.close()

        del scenario_route_walk_service_area
        del scenario_bike_service_area
        del overall_walk_service_area
        del overall_bike_service_area

        return {
            'walk_convertable_count': walk_sum,
            'bike_convertable_count': bike_sum,
        }
