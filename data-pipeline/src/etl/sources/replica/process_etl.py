from __future__ import annotations

import json
import logging
import os
import shutil
import time
from pathlib import Path
from pprint import pprint
from typing import Any, Literal, TypedDict, cast

import dask_geopandas
import geopandas
import pandas
import tqdm
from shapely.geometry.base import BaseGeometry
from tqdm.contrib.logging import logging_redirect_tqdm

from etl.sources.replica.etl import ReplicaETL
from etl.sources.replica.readers.partitions_to_gdf import partitions_to_gdf
from etl.sources.replica.transformers.as_points import as_points

logger = logging.getLogger('replica_process_etl')
logger.setLevel(logging.DEBUG)


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

    def __init__(self, parent: ReplicaETL, seasons: list[Season], area_geojson_paths: list[str] | list[Path], input_file_path_templates: InputFilePathTemplates):
        self.parent = parent
        self.seasons = seasons
        self.output_folder = Path(self.parent.folder_path)
        self.input_files = input_file_path_templates

        area_geojson_paths = [Path(path) for path in area_geojson_paths]
        area_names = [os.path.splitext(path.name)[0] for path in area_geojson_paths]
        self.areas = list(zip(area_geojson_paths, area_names))

    def process(self):
        statistics = {}

        start_time = time.time()
        [count, population_stats] = self.process_population()
        statistics['synthetic_demographics'] = population_stats
        elapsed_time = time.time() - start_time
        formatted_time = time.strftime("%H:%M:%S", time.gmtime(elapsed_time))
        logger.info('')
        logger.info(f'Population data processed for {count} season-areas in {formatted_time}.')
        logger.info('')

        start_time = time.time()
        [count, saturday_stats] = self.process_trips('saturday')
        statistics['saturday_trip'] = saturday_stats
        elapsed_time = time.time() - start_time
        formatted_time = time.strftime("%H:%M:%S", time.gmtime(elapsed_time))
        logger.info('')
        logger.info(f'Saturday trip data processed for {count} season-areas in {formatted_time}.')
        logger.info('')

        start_time = time.time()
        [count, thursday_stats] = self.process_trips('thursday')
        statistics['thursday_trip'] = thursday_stats
        elapsed_time = time.time() - start_time
        formatted_time = time.strftime("%H:%M:%S", time.gmtime(elapsed_time))
        logger.info('')
        logger.info(f'Thursday trip data processed for {count} season-areas in {formatted_time}.')
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
                    f'{area}/statistics/replica_{season_str}.json'
                os.makedirs(os.path.dirname(statistics_path), exist_ok=True)
                with open(statistics_path, 'w') as file:
                    json.dump(area_stats, file,)

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
                statistics: dict[Any, Any] = {
                    'synthetic_demographics': {},
                }

                # calculate race population estimates
                logger.debug('Calculating race population estimates...')
                statistics['synthetic_demographics']['race'] = population_filtered_df.groupby(
                    'race').size().to_dict()

                # calculate ethnicity population estimates
                logger.debug('Calculating ethnicity population estimates...')
                statistics['synthetic_demographics']['ethnicity'] = population_filtered_df.groupby(
                    'ethnicity').size().to_dict()

                # calculate education attainment population estimates
                logger.debug('Calculating education attainment population estimates...')
                statistics['synthetic_demographics']['education'] = population_filtered_df.groupby(
                    'education').size().to_dict()

                # calculate normal communte mode population estimates
                logger.debug('Calculating commute mode population estimates...')
                statistics['synthetic_demographics']['commute_mode'] = population_filtered_df.groupby(
                    'commute_mode').size().to_dict()

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

    def process_trips(self, day: Literal['saturday', 'thursday']) -> tuple[int, dict[str, Any]]:
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

            # open each chunk and filter it for each area
            # and save the filtered chunks to a file
            # for later combination
            logger.info(f'  Filtering full area chunks for each area...')
            with logging_redirect_tqdm():
                chunk_size = 10
                to_filter_count = int((partitioned_all_trips_dgdf.npartitions /
                                       chunk_size) * len(self.areas))
                bar = tqdm.tqdm(
                    desc=f'Filtering chunks ({year} {quarter} {day})', total=to_filter_count, unit='filter')
                for index in range(0, partitioned_all_trips_dgdf.npartitions, chunk_size):
                    output_chunk_index = int(index / chunk_size)

                    # select a slice of partitions
                    start = index
                    end = min(index + chunk_size, partitioned_all_trips_dgdf.npartitions)
                    logger.debug(
                        f'    --Slicing partitions {index + 1} through {end} of {partitioned_all_trips_dgdf.npartitions}...')
                    partitions_slice = partitioned_all_trips_dgdf.partitions[start:end]

                    for [area_geojson_path, area_name] in self.areas:
                        logger.info(f'    Processing area: {area_name}')

                        # open the geojson file
                        logger.debug(f'      Reading area GeoJSON: {area_geojson_path.as_posix()}')
                        gdf = geopandas.read_file(area_geojson_path).to_crs(epsg=4326)
                        logger.debug(
                            f'      Area GeoDataFrame has {gdf.shape[0]} rows and {gdf.shape[1]} columns.')
                        logger.debug(f'        Area GeoDataFrame CRS: {gdf.crs}')
                        logger.debug(f'        Creating union of area geometries for filtering.')
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
                            f'{region}_{year}_{quarter}__chunk_{output_chunk_index + 1}',
                            f'{day}_trip/{region}_{year}_{quarter}/_chunks',
                            'geoparquet',
                            '        '
                        )
                        bar.update(1)
                bar.close()

            # calculate statistics for each area
            with logging_redirect_tqdm():
                for [area_geojson_path, area_name] in tqdm.tqdm(self.areas, desc=f'Calculating {day} trip statistics ({year} {quarter} {day})', unit='area'):
                    logger.info(f'  Calculating statistics for {area_name}...')
                    statistics: dict[Any, Any] = {
                        'methods': {},
                        'median_duration': {},
                        'possible_conversions': {},
                        'destination_building_use': {}
                    }

                    logger.info('    Reading areas trips chunks...')
                    area_trips_chunks_path = self.output_folder / \
                        area_name / f'{day}_trip' / f'{region}_{year}_{quarter}' / '_chunks'
                    logger.debug(f'      Area trips chunks path: {area_trips_chunks_path}')
                    area_trips_chunks_dgdf = cast(dask_geopandas.GeoDataFrame,
                                                  dask_geopandas.read_parquet(area_trips_chunks_path, columns=['tour_type', 'mode', 'duration_minutes', 'destination_building_use_l1', 'destination_building_use_l2', 'end_lng', 'end_lat', 'geometry']))
                    logger.debug(
                        f'      Area trips chunks GeoDataFrame has {area_trips_chunks_dgdf.shape[0]} rows and {area_trips_chunks_dgdf.shape[1]} columns.')
                    logger.debug(
                        f'      Area trips chunks GeoDataFrame CRS: {area_trips_chunks_dgdf.crs.name}')
                    logger.info(f'  Computing area trips chunks GeoDataFrame...')
                    # TODO: repartion and then process in chunks instead of computing (combined file size is still many gigabytes)
                    trips_gdf = area_trips_chunks_dgdf.compute()

                    # count trip travel methods
                    logger.debug('    Counting trip travel methods...')
                    statistics['methods'] = count_trip_travel_methods(trips_gdf)

                    # calculate median trip commute time
                    logger.debug('    Calculating median trip commute time...')
                    statistics['median_duration'] = count_median_commute_time(trips_gdf)

                    # count possible conversions
                    logger.debug('    Counting possible conversions...')
                    statistics['possible_conversions'] = count_possible_conversions(
                        trips_gdf, walk_gdf, bike_gdf)

                    # get destination building uses for trips that use or could use public transit
                    logger.debug('    Counting destination building uses...')
                    statistics['destination_building_use'] = count_destination_building_use_in_service_area(
                        trips_gdf, walk_gdf, bike_gdf)

                    # save the statistics to the all_statistics dictionary so we can access them later
                    logger.debug(f'    Statistics for {area_name} added to all_statistics.')
                    season_str = f'{region}_{year}_{quarter}'
                    if season_str not in all_statistics:
                        all_statistics[season_str] = {}
                    if area_name not in all_statistics[season_str]:
                        all_statistics[season_str][area_name] = {}
                    all_statistics[season_str][area_name][day + '_trip'] = statistics

                    # save the trips GeoDataFrame to a file
                    logger.info(f'    Saving trips data for {area_name}...')
                    self.parent._save(
                        trips_gdf,
                        area_name,
                        f'{region}_{year}_{quarter}',
                        f'{day}_trip',
                        'geoparquet',
                        '      ',
                    )

                    processed_count += 1
                    del trips_gdf

                    # discard the chunks since we no longer need them
                    logger.debug(f'    Discarding area trips chunks...')
                    shutil.rmtree(area_trips_chunks_path, ignore_errors=True)

            del walk_gdf
            del bike_gdf

        # return the statistics for all areas in this season so that we can access them later
        return (processed_count, all_statistics)


def count_trip_travel_methods(trips_gdf: geopandas.GeoDataFrame) -> dict[str, int]:
    """Count the number of trips for each travel method."""

    tour_types = trips_gdf['tour_type'].str.lower().unique()

    stats = {}

    # for all
    mode_counts = trips_gdf.groupby('mode').size()
    mode_counts.index = mode_counts.index.str.lower()
    stats['__all'] = mode_counts.to_dict()

    # for each tour type (commute, undirected, etc.)
    for tour_type in tour_types:
        filter = (trips_gdf['tour_type'] == tour_type.upper())
        mode_counts = trips_gdf[filter].groupby('mode').size()
        mode_counts.index = mode_counts.index.str.lower()
        stats[tour_type] = mode_counts.to_dict()

    return stats


def count_median_commute_time(trips_gdf: geopandas.GeoDataFrame) -> dict[str, float]:
    """Count the median commute time for each travel method."""

    tour_types = trips_gdf['tour_type'].str.lower().unique()

    stats = {}

    # for all
    median_trip_duration = trips_gdf['duration_minutes'].median()
    stats['__all'] = median_trip_duration

    # for each tour type (commute, undirected, etc.)
    for tour_type in tour_types:
        filter = (trips_gdf['tour_type'] == tour_type.upper())
        median_trip_duration = trips_gdf[filter]['duration_minutes'].median()
        stats[tour_type] = median_trip_duration

    return stats


def count_possible_conversions(trips_gdf: geopandas.GeoDataFrame, walk_gdf: geopandas.GeoDataFrame, bike_gdf: geopandas.GeoDataFrame) -> dict[str, int]:
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

    stats = {}

    # get the trips that are not public transit
    transit_filter = (trips_gdf['mode'] != 'PUBLIC_TRANSIT')
    non_public_transit_trips_gdf = trips_gdf[transit_filter].reset_index(drop=True)

    # get the non-public transit trips that are within the walking service area
    logger.debug(
        '      Finding possible conversions for non-public transit trips within waking service area...')
    trips_within_walk_service_area_gdf = geopandas.sjoin(
        non_public_transit_trips_gdf,
        walk_gdf,
        how="inner",
        predicate="within"
    )
    stats['via_walk'] = len(trips_within_walk_service_area_gdf)

    # get the non-public transit trips that are within the biking service area
    logger.debug(
        '      Finding possible conversions for non-public transit trips within biking service area...')
    trips_within_bike_service_area_gdf = geopandas.sjoin(
        non_public_transit_trips_gdf,
        bike_gdf,
        how="inner",
        predicate="within"
    )
    stats['via_bike'] = len(trips_within_bike_service_area_gdf)

    return stats


def count_destination_building_use_in_service_area(trips_gdf: geopandas.GeoDataFrame, walk_gdf: geopandas.GeoDataFrame, bike_gdf: geopandas.GeoDataFrame) -> dict[Literal['via_walk', 'via_bike'], dict[Literal['type_counts', 'subtype_counts'], dict[str, int]]]:
    """Count the destination building uses for trips within the walking and biking service areas that currently use or could use public transit."""

    stats: dict[Literal['via_walk', 'via_bike'], dict[Literal['type_counts', 'subtype_counts'], dict[str, int]]] = {
        'via_walk': {'type_counts': {}, 'subtype_counts': {}},
        'via_bike': {'type_counts': {}, 'subtype_counts': {}},
    }

    end_points = as_points(trips_gdf, 'end_lng', 'end_lat')

    # get the trips that are within the walking service area
    mask = end_points.within(walk_gdf.geometry.union_all()).reindex(
        trips_gdf.index, fill_value=False)
    distinations_within_walk_service_area_gdf = trips_gdf[mask]

    # get the trips that are within the biking service area
    mask = end_points.within(bike_gdf.geometry.union_all()).reindex(
        trips_gdf.index, fill_value=False)
    destinations_within_bike_service_area_gdf = trips_gdf[mask]

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
