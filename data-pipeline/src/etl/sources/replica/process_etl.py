from __future__ import annotations

import gc
import hashlib
import itertools
import json
import logging
import math
import multiprocessing
import os
import shutil
import tempfile
import time
from multiprocessing.managers import DictProxy, ValueProxy
from pathlib import Path
from typing import Any, Literal, Optional, TypedDict, cast

import dask.dataframe
import dask_geopandas
import geopandas
import pandas
import tqdm
from pyproj import CRS
from shapely.geometry.base import BaseGeometry
from tqdm.contrib.logging import logging_redirect_tqdm

from etl.sources.replica.etl import ReplicaETL
from etl.sources.replica.readers.partitions_to_gdf import partitions_to_gdf
from etl.sources.replica.transformers.as_points import as_points
from etl.sources.replica.transformers.count_segment_frequency import \
    count_segment_frequency_multi_input
from etl.sources.replica.transformers.to_vector_tiles import (
    NoVectorDataError, to_vector_tiles)

logger = logging.getLogger('replica_process_etl')
logger.setLevel(logging.DEBUG)

replica_logger = logging.getLogger('replica_etl')


class Season(TypedDict):
    region: str
    year: int
    quarter: str


class InputFilePathTemplates(TypedDict):
    population_home: str
    population_school: str
    population_work: str
    walk_service_area: str
    bike_service_area: str
    saturday_trip: str
    thursday_trip: str


class ReplicaProcessETL:
    parent: ReplicaETL
    seasons: list[Season]
    areas: list[tuple[Path, str]]
    output_folder: Path
    input_files: InputFilePathTemplates
    areas_seasons_hash: str
    data_geo_hash: str
    days: list[Literal['saturday', 'thursday']]

    def __init__(self, parent: ReplicaETL, seasons: list[Season], area_geojson_paths: list[str] | list[Path], input_file_path_templates: InputFilePathTemplates, days: list[Literal['saturday', 'thursday']] = ['saturday', 'thursday']) -> None:
        self.parent = parent
        self.seasons = seasons
        self.output_folder = Path(self.parent.folder_path)
        self.input_files = input_file_path_templates
        self.days = days

        area_geojson_paths = [Path(path) for path in area_geojson_paths]
        area_names = [os.path.splitext(path.name)[0] for path in area_geojson_paths]
        self.areas = list(zip(area_geojson_paths, area_names))

        self.areas_seasons_hash = self.create_season_areas_hash(seasons, area_names)

        full_area_path = './input/replica_interest_area_polygons/full_area.geojson'
        full_area_geometry_to_hash = geopandas.read_file(full_area_path).geometry.union_all().wkb
        self.data_geo_hash = hashlib.md5(full_area_geometry_to_hash).hexdigest()

    def process(self):
        statistics: dict[str, Any] = {}
        logger.debug('Cache ID: ' + self.areas_seasons_hash)

        population_stats_cache_path = self.output_folder / \
            f'population_stats_cache__{self.areas_seasons_hash}.json.tmp'

        if population_stats_cache_path.exists():
            with open(population_stats_cache_path, 'r') as file:
                statistics['synthetic_demographics'] = json.load(file)
                logger.info(
                    f'Population stats retrieved from the cache.')
        else:
            start_time = time.time()
            shared_count = multiprocessing.Manager().Value('i', 0)
            shared_stats = multiprocessing.Manager().dict()
            process = multiprocessing.Process(
                target=self.mp__process_population,
                args=(shared_count, shared_stats)
            )
            process.start()
            process.join()
            process.close()

            statistics['synthetic_demographics'] = shared_stats.copy()

            elapsed_time = time.time() - start_time
            formatted_time = time.strftime("%H:%M:%S", time.gmtime(elapsed_time))

            # save to cache
            with open(population_stats_cache_path, 'w') as file:
                json.dump(statistics['synthetic_demographics'], file)

            logger.info('')
            logger.info(
                f'Population data processed for {shared_count.value} season-areas in {formatted_time}.')
            logger.info('')

        for _season in self.seasons:
            season_str = f"{_season['region']}_{_season['year']}_{_season['quarter']}"
            season_areas_hash = self.create_season_areas_hash(
                [_season], [area_name for _, area_name in self.areas])
            season_saturday_stats_cache_path = self.output_folder / \
                f'saturday_stats_cache__{season_str}__{season_areas_hash}.json.tmp'
            season_thursday_stats_cache_path = self.output_folder / \
                f'thursday_stats_cache__{season_str}__{season_areas_hash}.json.tmp'

            # ensure the saturday and thursday trip keys exist
            statistics.setdefault('saturday_trip', {})
            statistics.setdefault('thursday_trip', {})

            if 'saturday' in self.days:
                if season_saturday_stats_cache_path.exists():
                    with open(season_saturday_stats_cache_path, 'r') as file:
                        saturday_stats = json.load(file)
                        statistics['saturday_trip'][season_str] = saturday_stats[season_str]

                        logger.info(
                            f'Saturday trip stats retrieved for {season_str} from the cache. [Cache ID: {season_areas_hash}]')
                else:
                    start_time = time.time()

                    [count, saturday_stats] = self.process_trips('saturday', [_season])
                    statistics['saturday_trip'][season_str] = saturday_stats[season_str]

                    elapsed_time = time.time() - start_time
                    formatted_time = time.strftime("%H:%M:%S", time.gmtime(elapsed_time))

                    # save to cache
                    with open(season_saturday_stats_cache_path, 'w') as file:
                        json.dump(saturday_stats, file)

                    logger.info('')
                    logger.info(
                        f'Saturday trip data processed for {count} areas in {season_str} in {formatted_time}.')
                    logger.info('')

            if 'thursday' in self.days:
                if season_thursday_stats_cache_path.exists():
                    with open(season_thursday_stats_cache_path, 'r') as file:
                        thursday_stats = json.load(file)
                        statistics['thursday_trip'][season_str] = thursday_stats[season_str]

                        logger.info(
                            f'Thursday trip stats retrieved for {season_str} from the cache. [Cache ID: {season_areas_hash}]')
                else:
                    start_time = time.time()

                    [count, thursday_stats] = self.process_trips('thursday', [_season])
                    statistics['thursday_trip'][season_str] = thursday_stats[season_str]

                    elapsed_time = time.time() - start_time
                    formatted_time = time.strftime("%H:%M:%S", time.gmtime(elapsed_time))

                    # save to cache
                    with open(season_thursday_stats_cache_path, 'w') as file:
                        json.dump(thursday_stats, file)

                    logger.info('')
                    logger.info(
                        f'Thursday trip data processed for {count} areas in {season_str} in {formatted_time}.')
                    logger.info('')

        for _season in self.seasons:
            season_str = f"{_season['region']}_{_season['year']}_{_season['quarter']}"
            season_areas_hash = self.create_season_areas_hash(
                [_season], [area_name for _, area_name in self.areas])
            season_saturday_rider_stats_cache_path = self.output_folder / \
                f'saturday_rider_stats_cache__{season_str}__{season_areas_hash}.json.tmp'
            season_thursday_rider_stats_cache_path = self.output_folder / \
                f'thursday_rider_stats_cache__{season_str}__{season_areas_hash}.json.tmp'

            # ensure the saturday and thursday trip keys exist
            statistics.setdefault('saturday_rider', {})
            statistics.setdefault('thursday_rider', {})

            if 'saturday' in self.days:
                if season_saturday_rider_stats_cache_path.exists():
                    with open(season_saturday_rider_stats_cache_path, 'r') as file:
                        saturday_rider_stats = json.load(file)
                        statistics['saturday_rider'][season_str] = saturday_rider_stats[season_str]

                        logger.info(
                            f'Saturday rider stats retrieved for {season_str} from the cache. [Cache ID: {season_areas_hash}]')
                else:
                    start_time = time.time()

                    [count, saturday_rider_stats] = self.calculate_public_transit_population_statistics(
                        'saturday')
                    statistics['saturday_rider'][season_str] = saturday_rider_stats[season_str]

                    elapsed_time = time.time() - start_time
                    formatted_time = time.strftime("%H:%M:%S", time.gmtime(elapsed_time))

                    # save to cache
                    with open(season_saturday_rider_stats_cache_path, 'w') as file:
                        json.dump({season_str: saturday_rider_stats[season_str]}, file)

                    logger.info('')
                    logger.info(
                        f'Saturday rider data processed for {count} areas in {season_str} in {formatted_time}.')
                    logger.info('')

            if 'thursday' in self.days:
                if season_thursday_rider_stats_cache_path.exists():
                    with open(season_thursday_rider_stats_cache_path, 'r') as file:
                        thursday_rider_stats = json.load(file)
                        statistics['thursday_rider'][season_str] = thursday_rider_stats[season_str]

                        logger.info(
                            f'Thursday rider stats retrieved for {season_str} from the cache. [Cache ID: {season_areas_hash}]')
                else:
                    start_time = time.time()

                    [count, thursday_rider_stats] = self.calculate_public_transit_population_statistics(
                        'thursday')
                    statistics['thursday_rider'][season_str] = thursday_rider_stats[season_str]

                    elapsed_time = time.time() - start_time
                    formatted_time = time.strftime("%H:%M:%S", time.gmtime(elapsed_time))

                    # save to cache
                    with open(season_thursday_rider_stats_cache_path, 'w') as file:
                        json.dump({season_str: thursday_rider_stats[season_str]}, file)

                    logger.info('')
                    logger.info(
                        f'Thursday rider data processed for {count} areas in {season_str} in {formatted_time}.')
                    logger.info('')

        # merge statistics for season + area combinations
        merged_statistics: dict[str, Any] = {}
        for stats_dict in statistics.values():
            for season, season_stats in stats_dict.items():
                for area, area_stats in season_stats.items():
                    for statistic, value in area_stats.items():
                        if season not in merged_statistics:
                            merged_statistics[season] = {}
                        if area not in merged_statistics[season]:
                            merged_statistics[season][area] = {}
                        merged_statistics[season][area][statistic] = value

        # save the merged statistics to a file
        for season_str, season_stats in merged_statistics.items():
            for area, area_stats in season_stats.items():
                statistics_path = self.output_folder / \
                    f'{area}/statistics/replica__{season_str}.json'
                os.makedirs(os.path.dirname(statistics_path), exist_ok=True)
                with open(statistics_path, 'w') as file:
                    json.dump(area_stats, file, indent=2)

        # start_time = time.time()
        # self.build_network_segments(self.days)
        # elapsed_time = time.time() - start_time
        # formatted_time = time.strftime("%H:%M:%S", time.gmtime(elapsed_time))
        # logger.info('')
        # logger.info(f'Network segments built in {formatted_time}.')
        # logger.info('')

        # # discard the chunks since we no longer need them
        # season_areas_days = list(itertools.product(
        #     self.seasons, [area_name for _, area_name in self.areas], self.days))
        # for _season, area_name, day in season_areas_days:
        #     region = _season['region']
        #     year = _season['year']
        #     quarter = _season['quarter']

        #     area_trips_chunks_path = self.output_folder / \
        #         area_name / f'{day}_trip' / f'{region}_{year}_{quarter}' / '_chunks'

        #     logger.info(
        #         f'Discarding trips chunks for {area_name} ({year} {quarter} {day})...')
        #     shutil.rmtree(area_trips_chunks_path, ignore_errors=True)

    def create_season_areas_hash(self, seasons: list[Season], areas: list[str]) -> str:
        """
        Create a hash based on the seasons and areas to ensure that the same
        data is not processed multiple times.
        """
        # sort the seasons
        sorted_seasons = sorted(seasons, key=lambda s: (s['year'], s['quarter']), reverse=True)

        # sort the areas
        sorted_areas = sorted(areas)

        season_areas_string_to_hash = ''.join(sorted_areas) + \
            ''.join([str(season['region']) + str(season['year']) + season['quarter']
                    for season in sorted_seasons])
        return hashlib.md5(season_areas_string_to_hash.encode('utf8')).hexdigest()

    def mp__process_population(self, shared_count: ValueProxy[int], shared_stats: DictProxy[str, Any]) -> None:
        [count, population_stats] = self.process_population()
        shared_count.value += count
        shared_stats.update(population_stats.items())

    def filter_intersected(self, gdf_or_partitions_path: geopandas.GeoDataFrame | str, gdf_union: BaseGeometry) -> geopandas.GeoDataFrame:
        """Filter an input GeoDataFrame or folder of GeoDataFrame partitions to only include geometries that intersect with the gdf."""

        # if the gdf is a string, it is a path to a folder of partitioned parquet files
        if isinstance(gdf_or_partitions_path, str):
            return partitions_to_gdf(gdf_or_partitions_path, gdf_union, indent=9)

        # if the gdf is a GeoDataFrame, filter it
        return gdf_or_partitions_path[gdf_or_partitions_path.intersects(gdf_union)]

    def process_population(self) -> tuple[int, dict[str, Any]]:
        logger.info('Processing population data for the following regions and seasons:')
        for season in self.seasons:
            region = season['region']
            year = season['year']
            quarter = season['quarter']
            logger.debug(f"Region: {region}, Year: {year}, Quarter: {quarter}")

        # create a statistics dictionary to hold the statistics for each area+seaso
        all_statistics: dict[Any, Any] = {}
        processed_count = 0

        for season in self.seasons:
            region = season['region']
            year = season['year']
            quarter = season['quarter']

            input_files = {
                'population_home': self.input_files['population_home'].format(region=region, year=year, quarter=quarter),
                'population_school': self.input_files['population_school'].format(region=region, year=year, quarter=quarter),
                'population_work': self.input_files['population_work'].format(region=region, year=year, quarter=quarter),
                'walk_service_area': self.input_files['walk_service_area'].format(region=region, year=year, quarter=quarter),
                'bike_service_area': self.input_files['bike_service_area'].format(region=region, year=year, quarter=quarter),
            }

            logger.info(f'Processing population data for {region} in {year} {quarter}')
            logger.info(f'  Opening season population data files...')

            logger.info(f'    ...population data (home) [1/5]')
            population_home_input_path = self.output_folder / input_files['population_home']
            logger.debug(f'Population home input path: {population_home_input_path}')
            population_home_gdf = geopandas.read_file(population_home_input_path)

            logger.info(f'    ...population data (school) [2/5]')
            publication_school_input_path = self.output_folder / input_files['population_school']
            logger.debug(f'Population school input path: {publication_school_input_path}')
            population_school_gdf = geopandas.read_file(publication_school_input_path)

            logger.info(f'    ...population data (work) [3/5]')
            population_work_input_path = self.output_folder / input_files['population_work']
            logger.debug(f'Population work input path: {population_work_input_path}')
            population_work_gdf = geopandas.read_file(population_work_input_path)

            logger.info(f'    ...walking service area [4/5]')
            walk_input_path = input_files['walk_service_area']
            logger.debug(f'Walking service area input path: {walk_input_path}')
            walk_gdf = geopandas.read_file(walk_input_path)

            logger.info(f'    ...biking service area [5/5]')
            bike_input_path = input_files['bike_service_area']
            logger.debug(f'Biking service area input path: {bike_input_path}')
            bike_gdf = geopandas.read_file(bike_input_path)

            for [area_geojson_path, area_name] in self.areas:
                logger.info(f'  Processing area: {area_name}')

                # open the geojson file
                logger.debug(f'    Reading area GeoJSON: {area_geojson_path.as_posix()}')
                gdf = geopandas.read_file(area_geojson_path).to_crs(epsg=4326)
                logger.debug(
                    f'    Area GeoDataFrame has {gdf.shape[0]} rows and {gdf.shape[1]} columns.')
                logger.debug(f'    Area GeoDataFrame CRS: {gdf.crs}')
                logger.debug(f'    Creating union of area geometries for filtering.')
                gdf_union = gdf.geometry.union_all()

                # clip all of the geodataframes such that they are only within
                # the area for the current geojson file
                logger.info(f'  Filtering data for {area_name}...')

                logger.info(f'    ...population (home) [1/4]')
                population_home_filtered_gdf = self.filter_intersected(
                    population_home_gdf, gdf_union)

                logger.info(f'    ...population (school) [2/4]')
                population_school_filtered_gdf = self.filter_intersected(
                    population_school_gdf, gdf_union)

                logger.info(f'    ...population (work) [3/4]')
                population_work_filtered_gdf = self.filter_intersected(
                    population_work_gdf, gdf_union)

                logger.info(f'    ...population (all) [4/4]')
                logger.debug(f'Concatenating filtered population data...')
                population_filtered_df = pandas.concat(
                    [
                        population_home_filtered_gdf,
                        population_school_filtered_gdf,
                        population_work_filtered_gdf
                    ],
                    ignore_index=True
                )
                population_filtered_df = population_filtered_df.drop(columns=['geometry'])
                logger.debug(
                    f'Filtered population DataFrame has {population_filtered_df.shape[0]} rows and {population_filtered_df.shape[1]} columns.')
                logger.debug('Dropping duplicates based on person_id...')
                population_filtered_df = population_filtered_df.drop_duplicates(subset=[
                                                                                'person_id'])
                logger.info(f'  Calculating statistics for {area_name}...')
                statistics = self.calculate_population_statistics(population_filtered_df)

                # count households and population covered by the service areas (home-based)
                logger.debug('Counting households and population in service areas...')

                statistics['synthetic_demographics']['households_in_service_area'] = {}
                statistics['synthetic_demographics']['households_in_service_area']['walk'] = population_home_filtered_gdf[
                    population_home_filtered_gdf.intersects(walk_gdf.union_all())
                ]['household_id'].nunique()
                statistics['synthetic_demographics']['households_in_service_area']['bike'] = population_home_filtered_gdf[
                    population_home_filtered_gdf.intersects(bike_gdf.union_all())
                ]['household_id'].nunique()

                statistics['synthetic_demographics']['population_in_service_area'] = {}
                statistics['synthetic_demographics']['population_in_service_area']['walk'] = population_home_filtered_gdf[
                    population_home_filtered_gdf.intersects(walk_gdf.union_all())
                ]['person_id'].nunique()
                statistics['synthetic_demographics']['population_in_service_area']['bike'] = population_home_filtered_gdf[
                    population_home_filtered_gdf.intersects(bike_gdf.union_all())
                ]['person_id'].nunique()

                # save the statistics to the all_statistics dictionary so we can access them later
                logger.debug(f'Statistics for {area_name} added to all_statistics.')
                season_str = f'{region}_{year}_{quarter}'
                if season_str not in all_statistics:
                    all_statistics[season_str] = {}
                all_statistics[season_str][area_name] = statistics

                # save the filtered data to files
                logger.info(f'  Saving data for {area_name}...')
                logger.debug(f'    Saving area polygon GeoDataFrame...')
                area_polygon_gdf = geopandas.GeoDataFrame(
                    {'name': [area_name], 'geometry': gdf_union},
                    crs=gdf.crs
                ).to_crs('EPSG:4326')
                self.parent._save(
                    area_polygon_gdf,
                    area_name,
                    f'polygon',
                    '',
                    'geojson',
                    '    ',
                )
                del area_polygon_gdf
                logger.debug(f'    Saving filtered population data (home-based)...')
                self.parent._save(
                    population_home_filtered_gdf,
                    area_name,
                    f'{region}_{year}_{quarter}_home',
                    'population',
                    'geoparquet',
                    '    ',
                )
                del population_home_filtered_gdf
                logger.debug(f'    Saving filtered population data (school-based)...')
                self.parent._save(
                    population_school_filtered_gdf,
                    area_name,
                    f'{region}_{year}_{quarter}_school',
                    'population',
                    'geoparquet',
                    '    ',
                )
                del population_school_filtered_gdf
                logger.debug(f'    Saving filtered population data (work-based)...')
                self.parent._save(
                    population_work_filtered_gdf,
                    area_name,
                    f'{region}_{year}_{quarter}_work',
                    'population',
                    'geoparquet',
                    '    ',
                )
                del population_work_filtered_gdf
                logger.debug(f'    Saving filtered population data (combined)...')
                self.parent._save(
                    population_filtered_df,
                    area_name,
                    f'{region}_{year}_{quarter}',
                    'population',
                    'json',
                    '    ',
                )
                del population_filtered_df

                processed_count += 1

        # return the statistics for all areas in this season so that we can access them later
        return (processed_count, all_statistics)

    def calculate_population_statistics(self, population_df: pandas.DataFrame) -> dict[str, Any]:
        statistics: dict[Any, Any] = {
            'synthetic_demographics': {},
        }

        # calculate race population estimates
        logger.debug('Calculating race population estimates...')
        statistics['synthetic_demographics']['race'] = population_df.groupby(
            'race').size().to_dict()

        # calculate ethnicity population estimates
        logger.debug('Calculating ethnicity population estimates...')
        statistics['synthetic_demographics']['ethnicity'] = population_df.groupby(
            'ethnicity').size().to_dict()

        # calculate education attainment population estimates
        logger.debug('Calculating education attainment population estimates...')
        statistics['synthetic_demographics']['education'] = population_df.groupby(
            'education').size().to_dict()

        # calculate normal communte mode population estimates
        logger.debug('Calculating commute mode population estimates...')
        statistics['synthetic_demographics']['commute_mode'] = population_df.groupby(
            'commute_mode').size().to_dict()

        # count households
        logger.debug('Counting households...')
        statistics['synthetic_demographics']['households'] = population_df['household_id'].nunique()

        # count total population
        logger.debug('Counting total population...')
        statistics['synthetic_demographics']['population'] = len(population_df)

        return statistics

    def process_trips(self, day: Literal['saturday', 'thursday'], seasons: Optional[list[Season]] = None) -> tuple[int, dict[str, Any]]:
        if seasons is None:
            seasons = self.seasons

        logger.info('Processing population data for the following regions and seasons:')
        for season in seasons:
            region = season['region']
            year = season['year']
            quarter = season['quarter']
            logger.debug(f"Region: {region}, Year: {year}, Quarter: {quarter}")

        # create a statistics dictionary to hold the statistics for each area+seaso
        all_statistics: dict[Any, Any] = {}
        processed_count = 0

        for season in seasons:
            region = season['region']
            year = season['year']
            quarter = season['quarter']

            inputs = {
                'walk_service_area': self.input_files['walk_service_area'].format(region=region, year=year, quarter=quarter),
                'bike_service_area': self.input_files['bike_service_area'].format(region=region, year=year, quarter=quarter),
                'trips': self.input_files['saturday_trip' if day == 'saturday' else 'thursday_trip'].format(region=region, year=year, quarter=quarter),
            }

            logger.info(f'Processing trip data for {region} in {year} {quarter}')
            logger.info(f'  Opening season data files...')

            logger.info(f'    ...walking service area [1/2]')
            walk_input_path = inputs['walk_service_area']
            logger.debug(f'          Walking service area input path: {walk_input_path}')
            walk_gdf = geopandas.read_file(walk_input_path)

            logger.info(f'    ...biking service area [2/2]')
            bike_input_path = inputs['bike_service_area']
            logger.debug(f'          Biking service area input path: {bike_input_path}')
            bike_gdf = geopandas.read_file(bike_input_path)

            logger.info(f'  Staging trip data for {region} in {year} {quarter}...')
            trip_partitions_folder_path = self.output_folder / inputs['trips']
            logger.debug(f'    Trip partitions path: {trip_partitions_folder_path}')
            partitioned_all_trips_dgdf = cast(dask_geopandas.GeoDataFrame,
                                              dask_geopandas.read_parquet(trip_partitions_folder_path))
            trips_crs: CRS | None = partitioned_all_trips_dgdf.crs

            if trips_crs is None:
                logger.warning(f'No CRS found for trip partitions. Setting to EPSG:4326.')
                trips_crs = CRS.from_epsg(4326)

            # open each chunk and filter it for each area
            # and save the filtered chunks to a file
            # for later combination
            logger.info(f'  Filtering full area chunks for each area...')
            with logging_redirect_tqdm():
                chunk_size = 10
                to_filter_count = math.ceil(
                    partitioned_all_trips_dgdf.npartitions / chunk_size) * len(self.areas)
                bar = tqdm.tqdm(
                    desc=f'Filtering chunks ({year} {quarter} {day})', total=to_filter_count, unit='filter')
                for index in range(0, partitioned_all_trips_dgdf.npartitions, chunk_size):
                    output_chunk_index = int(index / chunk_size)  # starts at 1

                    # select a slice of partitions
                    start = index
                    end = min(index + chunk_size, partitioned_all_trips_dgdf.npartitions)
                    logger.debug(
                        f'    --Slicing partitions {index + 1} through {end} of {partitioned_all_trips_dgdf.npartitions}...')
                    partitions_slice = partitioned_all_trips_dgdf.partitions[start:end]

                    for [area_geojson_path, area_name] in self.areas:

                        def process_area():
                            logger.info(f'    Processing area: {area_name}')
                            chunk_name = f'{region}_{year}_{quarter}__chunk_{output_chunk_index + 1}'

                            # skip the area if it is already complete
                            complete_indicator_path = self.output_folder / area_name / \
                                f'{day}_trip' / f'{region}_{year}_{quarter}' / \
                                '_chunks' / f'{chunk_name}__{self.data_geo_hash}.success'
                            if complete_indicator_path.exists():
                                logger.debug(
                                    f'      Skipping {area_name} since it is already complete.')
                                return

                            # open the geojson file
                            logger.debug(
                                f'      Reading area GeoJSON: {area_geojson_path.as_posix()}')
                            gdf = geopandas.read_file(area_geojson_path).to_crs(epsg=4326)
                            logger.debug(
                                f'      Area GeoDataFrame has {gdf.shape[0]} rows and {gdf.shape[1]} columns.')
                            logger.debug(f'        Area GeoDataFrame CRS: {gdf.crs}')
                            logger.debug(
                                f'        Creating union of area geometries for filtering.')
                            gdf_union = gdf.geometry.union_all()

                            # filter the partition for the current area
                            logger.info(f'      Filtering partition for {area_name}...')
                            filtered_partition_gdf = partitions_slice[partitions_slice.intersects(
                                gdf_union)].compute()

                            # save the filtered partition to a file
                            logger.info(f'      Saving filtered partition for {area_name}...')
                            self.parent._save(
                                filtered_partition_gdf,
                                area_name,
                                chunk_name,
                                f'{day}_trip/{region}_{year}_{quarter}/_chunks',
                                'geoparquet',
                                '        '
                            )

                            # create an indicator file to show that this chunk is processed
                            # for the current area
                            complete_indicator_path.touch(exist_ok=True)

                            del gdf
                            del gdf_union
                            del filtered_partition_gdf
                            gc.collect()

                        process_area()
                        bar.update(1)

                bar.close()

            # calculate statistics for each area
            with logging_redirect_tqdm():
                for [area_geojson_path, area_name] in tqdm.tqdm(self.areas, desc=f'Calculating {day} trip statistics ({year} {quarter} {day})', unit='area', position=1):
                    logger.info(f'  Calculating statistics for {area_name}...')
                    statistics: dict[Any, Any] = {
                        'methods': {},
                        'median_duration': {},
                        'possible_conversions': {},
                        'destination_building_use': {},
                        'destination_building_use__by_tour_type': {},
                    }

                    logger.debug('    Reading areas trips chunks...')
                    area_trips_chunks_path = self.output_folder / \
                        area_name / f'{day}_trip' / f'{region}_{year}_{quarter}' / '_chunks'
                    logger.debug(f'      Area trips chunks path: {area_trips_chunks_path}')
                    area_trips_chunks_ddf = cast(dask.dataframe.DataFrame,
                                                 dask.dataframe.read_parquet(area_trips_chunks_path, columns=['tour_type', 'mode', 'duration_minutes', 'destination_building_use_l1', 'destination_building_use_l2', 'end_lng', 'end_lat']))
                    area_trips_chunks_dgdf = cast(dask_geopandas.GeoDataFrame,
                                                  dask_geopandas.read_parquet(area_trips_chunks_path, columns=['mode', 'geometry']))
                    logger.debug(f'    Computing DataFrame...')
                    trips_df = area_trips_chunks_ddf.compute()

                    # count trip travel methods
                    logger.debug('    Counting trip travel methods...')
                    statistics['methods'] = count_trip_travel_methods(trips_df)

                    # calculate median trip commute time
                    logger.debug('    Calculating median trip commute time...')
                    statistics['median_duration'] = count_median_commute_time(trips_df)

                    # get destination building use for all trips
                    logger.debug('    Counting destination building uses...')
                    statistics['destination_building_use'] = count_destination_building_use_in_service_area(
                        trips_df, trips_crs, walk_gdf, bike_gdf)

                    # get desintation building use by tour type for all trips
                    statistics['destination_building_use__by_tour_type'] = count_destination_building_use_in_service_area_by_tour_type(
                        trips_df, trips_crs, walk_gdf, bike_gdf)

                    # count the possible conversions in chunks (the geometry column is required, but it is huge)
                    logger.debug('    Counting possible conversions...')
                    for partition in tqdm.tqdm(area_trips_chunks_dgdf.to_delayed(), desc=f'Counting possible conversions for {area_name} ({year} {quarter} {day})', unit='partition', position=0):
                        logger.debug('      Computing partition...')
                        partition_gdf = partition.compute()

                        logger.debug('      Counting...')
                        results = count_possible_conversions(partition_gdf, walk_gdf, bike_gdf)

                        for via, count in results.items():
                            if via not in statistics['possible_conversions']:
                                statistics['possible_conversions'][via] = 0
                            statistics['possible_conversions'][via] += count

                        del partition_gdf
                        del partition
                        gc.collect()

                    # save the statistics to the all_statistics dictionary so we can access them later
                    logger.debug(f'    Statistics for {area_name} added to all_statistics.')
                    season_str = f'{region}_{year}_{quarter}'
                    if season_str not in all_statistics:
                        all_statistics[season_str] = {}
                    if area_name not in all_statistics[season_str]:
                        all_statistics[season_str][area_name] = {}
                    all_statistics[season_str][area_name][day + '_trip'] = statistics

                    # TODO: do this with a non-column-filtered version of the trips_gdf
                    # # save the trips GeoDataFrame to a file
                    # # since we have already had to compute it
                    # logger.info(f'    Saving trips data for {area_name}...')
                    # self.parent._save(
                    #     trips_gdf,
                    #     area_name,
                    #     f'{region}_{year}_{quarter}',
                    #     f'{day}_trip',
                    #     'geoparquet',
                    #     '      ',
                    # )

                    processed_count += 1
                    del area_trips_chunks_ddf
                    del area_trips_chunks_dgdf
                    gc.collect()

            del walk_gdf
            del bike_gdf
            gc.collect()

        # return the statistics for all areas in this season so that we can access them later
        return (processed_count, all_statistics)

    def build_network_segments(self, days: list[Literal['saturday', 'thursday']]) -> None:
        # build network segments for each area
        season_areas_days = list(itertools.product(
            self.seasons, [area_name for _, area_name in self.areas], days))
        travel_modes = ['', 'biking', 'carpool', 'commercial', 'on_demand_auto',
                        'other_travel_mode', 'private_auto', 'public_transit', 'walking']
        bar = tqdm.tqdm(desc=f'Building network segments', unit='mode',
                        total=len(season_areas_days) * len(travel_modes), position=1)

        with logging_redirect_tqdm():
            for season, area_name, day in season_areas_days:
                region = season['region']
                year = season['year']
                quarter = season['quarter']

                logger.info(
                    f'Building network segments for {area_name} ({year} {quarter} {day})...')

                logger.info('  Reading trips chunks...')
                area_trips_chunks_path = self.output_folder / \
                    area_name / f'{day}_trip' / f'{region}_{year}_{quarter}' / '_chunks'
                logger.debug(f'    Area trips chunks path: {area_trips_chunks_path}')
                area_trips_chunks_dgdf = cast(dask_geopandas.GeoDataFrame,
                                              dask_geopandas.read_parquet(area_trips_chunks_path, columns=['activity_id', 'tour_type', 'mode', 'geometry']))
                logger.debug(
                    f'    Area trips chunks GeoDataFrame has {area_trips_chunks_dgdf.shape[0]} rows and {area_trips_chunks_dgdf.shape[1]} columns.')
                logger.debug(
                    f'    Area trips chunks GeoDataFrame CRS: {area_trips_chunks_dgdf.crs.name}')

                logger.info(f'  Building network segments...')
                intermediate_chunks_folder = area_trips_chunks_path.parent / '_intermediate_segment_chunks'
                os.makedirs(intermediate_chunks_folder, exist_ok=True)
                for index, travel_mode in enumerate(travel_modes):
                    if travel_mode == '':
                        full_table_name = f'{region}_{year}_{quarter}__{day}'
                        bar_label = f'{area_name} ({quarter} {year})'
                    else:
                        full_table_name = f'{region}_{year}_{quarter}__{day}__commute__{travel_mode}'
                        bar_label = f'{area_name} ({quarter} {year}) (commute:{travel_mode})'

                    os.makedirs('./data/tmp', exist_ok=True)
                    output_file_path = tempfile.NamedTemporaryFile(
                        suffix='.fgb', delete=False, dir='./data/tmp').name

                    filter = None if travel_mode == '' else [
                        ('mode', '==', travel_mode.upper()), ('tour_type', '==', 'COMMUTE')]

                    # skip exploding and hashing if it has already been done
                    done_chunks_count = len(list(area_trips_chunks_path.glob(
                        f'*__{self.data_geo_hash}.success')))
                    done_exploded_chunks_count = len(
                        list(intermediate_chunks_folder.glob(f'*__{self.data_geo_hash}.success')))
                    skip_explode = done_exploded_chunks_count == done_chunks_count

                    # calculate the frequencies for the network segments (may be slow)
                    frequency_bar = tqdm.tqdm(
                        desc=f'Counting segment frequencies for {bar_label}',
                        unit='step',
                        leave=False,
                        position=0,  # show above the other bar
                    )
                    for progress in count_segment_frequency_multi_input(
                        list(sorted(area_trips_chunks_path.glob('*.parquet'))),
                        output_file_path,
                        log_space='    ',
                        intermediate_chunks_folder=intermediate_chunks_folder.as_posix(),
                        step1_columns=['activity_id', 'tour_type', 'mode', 'geometry'],
                        skip_step_1=skip_explode or (index > 0),
                        step_2_filter=filter,
                        out_crs='EPSG:3857',
                        success_hash=self.data_geo_hash,
                    ):
                        frequency_bar.update(progress[0] - frequency_bar.n)
                        frequency_bar.total = progress[1]
                    frequency_bar.close()

                    # try to generate tiles for the network segments
                    logger.info(f'       ...generating tiles - {bar_label}')
                    tile_folder_path = self.output_folder / area_name / 'network_segments' / full_table_name
                    os.makedirs(tile_folder_path, exist_ok=True)
                    try:
                        tile_bar = tqdm.tqdm(
                            desc=f'Generating tiles for {bar_label}',
                            unit='%',
                            total=100,
                            leave=False,
                            position=0,  # show above the other bar
                        )
                        for current_percent_complete in to_vector_tiles(
                                geopandas.read_file(output_file_path), f'Network Segments ({area_name}) ({quarter} {year})', full_table_name, tile_folder_path.as_posix(), 14):
                            tile_bar.update(current_percent_complete - tile_bar.n)
                        tile_bar.close()

                        # zip (no compression) the tiles folder
                        zip_filename = f'{tile_folder_path}.vectortiles'
                        if os.path.exists(zip_filename):
                            os.remove(zip_filename)
                        os.system(
                            f'cd "{tile_folder_path}" && zip -0 -r {os.path.join('../', full_table_name + '.vectortiles')} . > /dev/null')

                    except NoVectorDataError:
                        logger.warning(
                            f'No vector data found for {bar_label}. Skipping tile generation.')
                        continue

                    except Exception as ex:
                        raise ex

                    finally:
                        # remove the tiles folder
                        shutil.rmtree(tile_folder_path, ignore_errors=True)

                        # remove the output flatgeobuf file
                        if os.path.exists(output_file_path):
                            os.remove(output_file_path)

                        # increment the main progress bar
                        bar.update(1)

                # clean up: remove the intermediate chunks folder
                if os.path.exists(intermediate_chunks_folder):
                    logger.info(
                        f'    Removing intermediate chunks folder: {intermediate_chunks_folder}')
                    shutil.rmtree(intermediate_chunks_folder, ignore_errors=True)

        bar.close()

    def calculate_public_transit_population_statistics(self, day: Literal['saturday', 'thursday']) -> tuple[int, dict[Any, Any]]:
        # create a statistics dictionary to hold the statistics for each area+seaso
        all_statistics: dict[Any, Any] = {}
        processed_count = 0

        for season in self.seasons:
            region = season['region']
            year = season['year']
            quarter = season['quarter']

            for [_, area_name] in self.areas:
                logger.info(f'  Processing area: {area_name}')

                area_population_path = self.output_folder / area_name / \
                    'population' / f'{region}_{year}_{quarter}_home.parquet'
                area_trip_chunks_folder_path = self.output_folder / area_name / \
                    f'{day}_trip' / f'{region}_{year}_{quarter}' / '_chunks'
                area_trip_chunk_paths = list(area_trip_chunks_folder_path.glob('*.parquet'))

                area_statistics: dict[str, Any] = {}

                for index, trip_chunk_path in enumerate(area_trip_chunk_paths):
                    logger.info(
                        f'  Processing trip chunk {index + 1} of {len(area_trip_chunk_paths)} for {area_name}...')

                    logger.debug(f'    Reading trip chunk: {trip_chunk_path}')
                    trips_df = pandas.read_parquet(trip_chunk_path, columns=['person_id', 'mode'], filters=[
                                                   ('mode', '==', 'PUBLIC_TRANSIT')])
                    logger.debug(
                        f'    Trip chunk has {trips_df.shape[0]} rows and {trips_df.shape[1]} columns.')

                    logger.debug('    Extracting unique public transit person IDs...')
                    public_transit_user_ids = trips_df['person_id']\
                        .dropna()\
                        .unique()\
                        .tolist()

                    # skip the chunk if there are no public transit users
                    if len(public_transit_user_ids) == 0:
                        logger.info(
                            f'    No public transit users found in this chunk. Skipping...')
                        continue

                    logger.info(f'    Reading population data for public transit users...')
                    public_transit_population_df = pandas.read_parquet(
                        area_population_path,
                        columns=['person_id', 'race', 'ethnicity',
                                 'education', 'commute_mode', 'household_id'],
                        filters=[('person_id', 'in', public_transit_user_ids)]
                    )

                    logger.info(f'    Calculating statistics for public transit users...')
                    chunk_statistics = self.calculate_population_statistics(
                        public_transit_population_df)
                    for key, value in chunk_statistics.items():
                        if key not in area_statistics:
                            area_statistics[key] = value
                        else:
                            for subkey, subvalue in value.items():
                                if subkey not in area_statistics[key]:
                                    area_statistics[key][subkey] = subvalue
                                else:
                                    if isinstance(subvalue, dict):
                                        for dict_key, dict_value in subvalue.items():
                                            if dict_key not in area_statistics[key][subkey]:
                                                area_statistics[key][subkey][dict_key] = dict_value
                                            else:
                                                area_statistics[key][subkey][dict_key] += dict_value
                                    else:
                                        area_statistics[key][subkey] += subvalue

                # save the statistics to the all_statistics dictionary so we can access them later
                season_str = f'{region}_{year}_{quarter}'
                if season_str not in all_statistics:
                    all_statistics[season_str] = {}
                if 'synthetic_demographics' not in area_statistics:
                    area_statistics['synthetic_demographics'] = None
                all_statistics[season_str][area_name] = {
                    f'{day}_trip__public_transit_synthetic_population_demographics': area_statistics['synthetic_demographics']
                }
                logger.debug(f'Statistics for {area_name} added to all_statistics.')
                processed_count += 1

        # return the statistics for all areas in this season so that we can access them later
        return (processed_count, all_statistics)


def count_trip_travel_methods(trips_df: pandas.DataFrame) -> dict[str, int]:
    """Count the number of trips for each travel method."""

    tour_types = trips_df['tour_type'].dropna().str.lower().unique()

    stats = {}

    # for all
    mode_counts = trips_df.groupby('mode').size()
    mode_counts.index = mode_counts.index.str.lower()
    stats['__all'] = mode_counts.to_dict()

    # for each tour type (commute, undirected, etc.)
    for tour_type in tour_types:
        filter = (trips_df['tour_type'] == tour_type.upper())
        mode_counts = trips_df[filter].groupby('mode').size()
        mode_counts.index = mode_counts.index.str.lower()
        stats[tour_type] = mode_counts.to_dict()

    return stats


def count_median_commute_time(trips_df: pandas.DataFrame) -> dict[str, float]:
    """Count the median commute time for each travel method."""

    tour_types = trips_df['tour_type'].dropna().str.lower().unique()

    stats = {}

    # for all
    median_trip_duration = trips_df['duration_minutes'].median()
    stats['__all'] = median_trip_duration

    # for each tour type (commute, undirected, etc.)
    for tour_type in tour_types:
        filter = (trips_df['tour_type'] == tour_type.upper())
        median_trip_duration = trips_df[filter]['duration_minutes'].median()
        stats[tour_type] = median_trip_duration

    return stats


def count_possible_conversions(trips_gdf: geopandas.GeoDataFrame, walk_gdf: geopandas.GeoDataFrame, bike_gdf: geopandas.GeoDataFrame) -> dict[Literal['via_walk', 'via_bike'], int]:
    """Count the number of possible conversions for each travel method."""

    # ensure CRS matches between trips and service areas
    if trips_gdf.crs != walk_gdf.crs:
        raise ValueError(
            f"CRS mismatch: trips_gdf CRS is {trips_gdf.crs}, but walk service area CRS is {walk_gdf.crs}. Both must be the same for spatial join.")
    if trips_gdf.crs != bike_gdf.crs:
        raise ValueError(
            f"CRS mismatch: trips_gdf CRS is {trips_gdf.crs}, but bike service area CRS is {bike_gdf.crs}. Both must be the same for spatial join.")

    # dissolve the walk and bike service areas
    walk_gdf = walk_gdf.dissolve().reset_index(drop=True)
    bike_gdf = bike_gdf.dissolve().reset_index(drop=True)

    stats: dict[Literal['via_walk', 'via_bike'], int] = {
        'via_walk': 0,
        'via_bike': 0,
    }

    # get the trips that are not public transit
    transit_filter = (trips_gdf['mode'] != 'PUBLIC_TRANSIT')
    non_public_transit_trips_gdf = trips_gdf[transit_filter].reset_index(drop=True)

    # get the non-public transit trips that are within the walking service area
    logger.debug(
        '        Finding possible conversions for non-public transit trips within waking service area...')
    trips_within_walk_service_area_gdf = geopandas.sjoin(
        non_public_transit_trips_gdf,
        walk_gdf,
        how="inner",
        predicate="within"
    )
    stats['via_walk'] = len(trips_within_walk_service_area_gdf)

    # get the non-public transit trips that are within the biking service area
    logger.debug(
        '        Finding possible conversions for non-public transit trips within biking service area...')
    trips_within_bike_service_area_gdf = geopandas.sjoin(
        non_public_transit_trips_gdf,
        bike_gdf,
        how="inner",
        predicate="within"
    )
    stats['via_bike'] = len(trips_within_bike_service_area_gdf)

    return stats


def count_destination_building_use_in_service_area(trips_df: pandas.DataFrame, trips_crs: CRS, walk_gdf: geopandas.GeoDataFrame, bike_gdf: geopandas.GeoDataFrame) -> dict[Literal['via_walk', 'via_bike'], dict[Literal['type_counts', 'subtype_counts'], dict[str, int]]]:
    """Count the destination building uses for trips within the walking and biking service areas that currently use or could use public transit."""

    stats: dict[Literal['via_walk', 'via_bike'], dict[Literal['type_counts', 'subtype_counts'], dict[str, int]]] = {
        'via_walk': {'type_counts': {}, 'subtype_counts': {}},
        'via_bike': {'type_counts': {}, 'subtype_counts': {}},
    }

    end_points = as_points(trips_df, 'end_lng', 'end_lat', trips_crs)

    # get the trips that end within the walking service area
    mask = end_points.within(walk_gdf.geometry.union_all()).reindex(
        trips_df.index, fill_value=False)
    distinations_within_walk_service_area_gdf = trips_df[mask]

    # get the trips that end within the biking service area
    mask = end_points.within(bike_gdf.geometry.union_all()).reindex(
        trips_df.index, fill_value=False)
    destinations_within_bike_service_area_gdf = trips_df[mask]

    # count the destination building use occurrences
    type_counts__walk = distinations_within_walk_service_area_gdf\
        .groupby('destination_building_use_l1').size()
    subtype_counts__walk = distinations_within_walk_service_area_gdf\
        .groupby('destination_building_use_l2').size()
    type_counts__bike = destinations_within_bike_service_area_gdf\
        .groupby('destination_building_use_l1').size()
    subtype_counts__bike = destinations_within_bike_service_area_gdf\
        .groupby('destination_building_use_l2').size()

    # store the counts in the statistics dictionary
    stats['via_walk'] = {
        'type_counts': type_counts__walk.to_dict(),
        'subtype_counts': subtype_counts__walk.to_dict(),
    }
    stats['via_bike'] = {
        'type_counts': type_counts__bike.to_dict(),
        'subtype_counts': subtype_counts__bike.to_dict(),
    }

    return stats


def count_destination_building_use_in_service_area_by_tour_type(trips_df: pandas.DataFrame, trips_crs: CRS, walk_gdf: geopandas.GeoDataFrame, bike_gdf: geopandas.GeoDataFrame) -> dict[str, dict[Literal['via_walk', 'via_bike'], dict[Literal['type_counts', 'subtype_counts'], dict[str, int]]]]:
    """Calls `count_destination_building_use_in_service_area` for each tour type and returns the results for each tour type in a dictionary."""

    tour_types = trips_df['tour_type'].dropna().str.lower().unique()

    stats: dict[str, dict[Literal['via_walk', 'via_bike'],
                          dict[Literal['type_counts', 'subtype_counts'], dict[str, int]]]] = {}

    # for each tour type (commute, undirected, etc.)
    for tour_type in tour_types:
        logger.debug(f'    Counting destination building uses for {tour_type} trips...')
        filter = (trips_df['tour_type'] == tour_type.upper())
        stats[tour_type] = count_destination_building_use_in_service_area(
            trips_df[filter],
            trips_crs,
            walk_gdf,
            bike_gdf,
        )

    return stats
