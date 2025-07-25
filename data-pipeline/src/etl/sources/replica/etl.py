import gc
import json
import logging
import multiprocessing
import os
import re
import shutil
from concurrent.futures import Future, ThreadPoolExecutor
from datetime import datetime
from typing import Any, Literal, Optional

import geopandas
import numpy
import pandas
import pandas_gbq
import polars
import pyarrow
import pyarrow.parquet as parquet
import shapely
import shapely.wkt

from etl.sources.replica.transformers.as_points import as_points
from etl.sources.replica.transformers.count_segment_frequency import \
    count_segment_frequency
from etl.sources.replica.transformers.to_vector_tiles import to_vector_tiles
from etl.sources.replica.transformers.trips_as_lines import (
    create_network_segments_lookup, trips_as_lines)

logger = logging.getLogger('pandas_gbq')
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())


class ReplicaETL:
    project_id = 'replica-customer'
    region = 'south_atlantic'
    input_folder_path = './input/replica_interest_area_polygons'
    folder_path = './data/replica'
    greenlink_gtfs_folder_path = './data/greenlink_gtfs'
    columns_to_select = 'household_id'
    use_bqstorage_api = os.getenv('USE_BIGQUERY_STORAGE_API', '0') == '1'

    def __init__(self, columns: list[str], years: Optional[list[int]] = None, quarters: Optional[list[Literal['Q2', 'Q4']]] = None) -> None:
        """
        Initializes the replica ETL with a sepecific dataset and columns from that
        dataset.
        """

        # append the columns to the existing columns_to_select
        if len(columns) > 0:
            self.columns_to_select += ', '
            self.columns_to_select += ','.join(columns)

        # ensure the output folder exists
        if not os.path.exists(self.folder_path):
            os.makedirs(self.folder_path)

        # get the schema for the replica dataset
        self.tables_to_download_df = self.query_schema(years, quarters)

    def run(self, mode: Literal['download', 'process', 'all'] = 'all') -> None:
        """Downloads or processes the downloaded replica data.

        In download mode, it downloads the data for the entire `full_area.geojson` boundary.
        `full_area.geojson` is a singular polygon that covers the entire area of interest.
        It should be provided in at `input/replica_interest_area_polygons/full_area.geojson`.

        In process mode (default when unauthenticated), it reads the other GeoJSON files from the
        `input/replica_interest_area_polygons` folder and filters the data downloaded for the
        `full_area` extent to the boundary for each GeoJSON file.

        In all mode (default when authenticated), this method will automatically run in download mode
        and then run in process mode.

        Args:
            mode (Literal['download', 'process', 'all']): The mode to run the ETL in. Defaults to 'all'. See method description for details.
        """
        full_area_filename = 'full_area.geojson'
        full_area_path = os.path.join(
            self.input_folder_path, full_area_filename)

        if mode == 'all':
            if pandas_gbq.context.credentials:
                self.run(mode='download')
            self.run(mode='process')

        if mode == 'download':
            if self.tables_to_download_df.empty:
                print('\nNo tables to download based on the provided season filters.')
                return

            area_name = 'full_area'

            # open the geojson file
            gdf = geopandas.read_file(full_area_path).to_crs(epsg=4326)

            # dissolve the features in the gdf, for use in the network_segments
            # and population tables, which do not have batching logic implimented
            # and require only a single polygon
            dissolved_gdf = gdf.dissolve()

            # set the name column to the area name
            # and discard all other columns
            gdf['name'] = area_name
            dissolved_gdf['name'] = area_name
            gdf = gdf[['name', 'geometry']].copy()
            dissolved_gdf = dissolved_gdf[['name', 'geometry']].copy()

            # get the geometry in wkt format
            gdf['geometry_wkt'] = gdf['geometry'].apply(
                lambda x: shapely.wkt.dumps(x))
            dissolved_gdf['geometry_wkt'] = dissolved_gdf['geometry'].apply(
                lambda x: shapely.wkt.dumps(x))

            # get network segments data
            self._run_for_network_segments(dissolved_gdf, area_name)
            # get population data
            self._run_for_pop_(dissolved_gdf, area_name)
            # get trip data (thursday and saturday trips)
            self._run_for_trips(gdf, area_name)

            print(f"\n\nSuccessfully downloaded data for {area_name}.")

        if mode == 'process':
            # determine the requested seasons
            # (get a dataframe of each unique set of region, year, and quarter)
            seasons = self.infer_schema().drop(
                columns=['table_name', 'dataset']).drop_duplicates().reset_index(drop=True)

            # require that the expected parquet files exist
            expected_parquet_files = self._getExpectedParquetFilePaths()
            for season in seasons.itertuples():
                for expected_filename_template in expected_parquet_files:
                    expected_filename = expected_filename_template.format(
                        region=season.region, year=season.year, quarter=season.quarter)
                    full_expected_path = os.path.join(
                        self.folder_path, expected_filename)
                    if not os.path.exists(full_expected_path):
                        raise FileNotFoundError(
                            f"Expected output file {full_expected_path} does not exist. Please run in 'download' mode first.")

            # get all geojson file names from the input folder
            # so we can filter/process the full_area data to each geojson file extent
            input_filenames = os.listdir(self.input_folder_path)
            geojson_filenames = list(sorted([
                filename for filename in input_filenames if filename.endswith('.geojson') and filename != full_area_filename
            ]))

            for season in seasons.itertuples():
                region = season.region
                year = season.year
                quarter = season.quarter

                print(f'\nProcessing season {year} {quarter} for region {region}...')

                print(f'  Opening source data for season {year} {quarter}')

                # print(f'    ...network segments [0/5]')
                # network_segments = geopandas.read_file(os.path.join(
                #     self.folder_path,
                #     expected_parquet_files[0].format(region=region, year=year, quarter=quarter)
                # ))
                print(f'    ...population data (home) [1/7]')
                population_home = geopandas.read_file(os.path.join(
                    self.folder_path,
                    expected_parquet_files[1].format(region=region, year=year, quarter=quarter)
                ))

                print(f'    ...population data (school) [2/7]')
                population_school = geopandas.read_file(os.path.join(
                    self.folder_path,
                    expected_parquet_files[2].format(region=region, year=year, quarter=quarter)
                ))

                print(f'    ...population data (work) [3/7]')
                population_work = geopandas.read_file(os.path.join(
                    self.folder_path,
                    expected_parquet_files[3].format(region=region, year=year, quarter=quarter)
                ))

                print(f'    ...saturday trip [4/7]')
                saturday_trip = geopandas.read_file(os.path.join(
                    self.folder_path,
                    expected_parquet_files[4].format(region=region, year=year, quarter=quarter)
                ))

                print(f'    ...thursday trip [5/7]')
                thursday_trip = geopandas.read_file(os.path.join(
                    self.folder_path,
                    expected_parquet_files[5].format(region=region, year=year, quarter=quarter)
                ))

                print(f'    ...walking service area [6/7]')
                walk_gdf = geopandas.read_file(os.path.join(
                    self.greenlink_gtfs_folder_path,
                    f'{year}/{quarter}/walk_service_area.geojson',
                ))

                print(f'    ...biking service area [7/7]')
                bike_gdf = geopandas.read_file(os.path.join(
                    self.greenlink_gtfs_folder_path,
                    f'{year}/{quarter}/bike_service_area.geojson',
                ))

                for filename in geojson_filenames:
                    # extract the area name from the filename
                    area_name = os.path.splitext(filename)[0]

                    print('Processing area:', area_name)

                    # open the geojson file
                    gdf = geopandas.read_file(os.path.join(
                        self.input_folder_path, filename)).to_crs(epsg=4326)
                    gdf_union = gdf.geometry.union_all()

                    # clip all of the geodataframes such that they are only within
                    # the area for the current geojson file
                    print(f'  Filtering data for {area_name}...')

                    def filter_intersected(gdf: geopandas.GeoDataFrame) -> geopandas.GeoDataFrame:
                        """Filter the GeoDataFrame to only include geometries that intersect with the gdf."""
                        return gdf[gdf.intersects(gdf_union)]

                    def merge_filtered(gdfs: list[geopandas.GeoDataFrame], id_column: str) -> geopandas.GeoDataFrame:
                        """Merge filtered GeoDataFrames.

                        Args:
                            gdfs (list[geopandas.GeoDataFrame]): The list of GeoDataFrames to merge.
                            id_column (str): The name of the ID column to use for merging.

                        Returns:
                            geopandas.GeoDataFrame: The merged DataFrame.
                        """

                        # fmt: off
                        merged: geopandas.GeoDataFrame = pandas.concat(gdfs, ignore_index=True) # type: ignore
                        # fmt: on

                        # drop duplicates based on id field
                        merged = merged.drop_duplicates(subset=[id_column])

                        # empty the geometry column
                        merged['geometry'] = None

                        return merged

                    print(f'    ...population (home) [1/6]')
                    population_home_filtered = filter_intersected(population_home)
                    print(f'    ...population (school) [2/6]')
                    population_school_filtered = filter_intersected(population_school)
                    print(f'    ...population (work) [3/6]')
                    population_work_filtered = filter_intersected(population_work)
                    print(f'    ...population (all) [4/6]')
                    population_filtered_df = merge_filtered(
                        [population_home_filtered, population_school_filtered, population_work_filtered],
                        'person_id'
                    )
                    print(f'    ...saturday trip [5/6]')
                    saturday_trip_filtered = filter_intersected(saturday_trip)
                    print(f'    ...thursday trip [6/6]')
                    thursday_trip_filtered = filter_intersected(thursday_trip)

                    print(f'  Transforming data for {area_name}...')

                    network_segments_subsets: list[tuple[str, geopandas.GeoDataFrame]] = []
                    days = ['saturday', 'thursday']
                    travel_modes = ['biking', 'carpool', 'commercial', 'on_demand_auto',
                                    'other_travel_mode', 'private_auto', 'public_transit', 'walking']
                    total_segment_exports = len(days) * (len(travel_modes) + 1)
                    current_segment_export = 0
                    for day in days:
                        current_segment_export += 1
                        print(
                            f'    ...building {day} network segments [{current_segment_export}/{total_segment_exports}]'
                        )

                        trips_gdf = saturday_trip_filtered if day == 'saturday' else thursday_trip_filtered
                        day_network_segments = count_segment_frequency(trips_gdf)
                        network_segments_subsets.append((f'__{day}', day_network_segments))

                        for travel_mode in travel_modes:
                            current_segment_export += 1
                            print(
                                f'    ...building {day} network segments (commute:{travel_mode}) [{current_segment_export}/{total_segment_exports}]'
                            )

                            filter = (trips_gdf['mode'] == travel_mode.upper())\
                                & (trips_gdf['tour_type'] == 'COMMUTE')
                            day_travel_mode_network_segments = count_segment_frequency(
                                trips_gdf[filter]
                            )
                            network_segments_subsets.append((
                                f'__{day}__commute__{travel_mode}',
                                day_travel_mode_network_segments
                            ))

                    print(f'  Calculating statistics for {area_name}...')
                    statistics: dict[Any, Any] = {
                        'synthetic_demographics': {},
                        'saturday_trip': {'methods': {}, 'median_duration': {}, 'possible_conversions': {}, 'destination_building_use': {}},
                        'thursday_trip': {'methods': {}, 'median_duration': {}, 'possible_conversions': {}, 'destination_building_use': {}},
                    }

                    # calculate race population estimates
                    statistics['synthetic_demographics']['race'] = population_filtered_df.groupby(
                        'race').size().to_dict()

                    # calculate ethnicity population estimates
                    statistics['synthetic_demographics']['ethnicity'] = population_filtered_df.groupby(
                        'ethnicity').size().to_dict()

                    # calculate education attainment population estimates
                    statistics['synthetic_demographics']['education'] = population_filtered_df.groupby(
                        'education').size().to_dict()

                    # calculate normal communte mode population estimates
                    statistics['synthetic_demographics']['commute_mode'] = population_filtered_df.groupby(
                        'commute_mode').size().to_dict()

                    # count trip travel methods
                    for day in days:
                        trips_gdf = saturday_trip_filtered if day == 'saturday' else thursday_trip_filtered
                        tour_types = trips_gdf['tour_type'].str.lower().unique()

                        # for all
                        mode_counts = trips_gdf.groupby('mode').size()
                        mode_counts.index = mode_counts.index.str.lower()
                        statistics[f'{day}_trip']['methods']['__all'] = mode_counts.to_dict()

                        # for each tour type (commute, undirected, etc.)
                        for tour_type in tour_types:
                            filter = (trips_gdf['tour_type'] == tour_type.upper())
                            mode_counts = trips_gdf[filter].groupby('mode').size()
                            mode_counts.index = mode_counts.index.str.lower()
                            statistics[f'{day}_trip']['methods'][tour_type] = mode_counts.to_dict()

                    # calculate median trip commute time
                    for day in days:
                        trips_gdf = saturday_trip_filtered if day == 'saturday' else thursday_trip_filtered
                        tour_types = trips_gdf['tour_type'].str.lower().unique()

                        # for all
                        median_trip_duration = trips_gdf['duration_minutes'].median()
                        statistics[f'{day}_trip']['median_duration']['__all'] = median_trip_duration

                        # for each tour type (commute, undirected, etc.)
                        for tour_type in tour_types:
                            filter = (trips_gdf['tour_type'] == tour_type.upper())
                            median_trip_duration = trips_gdf[filter]['duration_minutes'].median()
                            statistics[f'{day}_trip']['median_duration'][tour_type] = median_trip_duration

                    # count trips that could use public transit
                    for day in days:
                        trips_gdf = saturday_trip_filtered if day == 'saturday' else thursday_trip_filtered

                        # get the trips that are not public transit
                        transit_filter = (trips_gdf['mode'] != 'PUBLIC_TRANSIT')
                        non_public_transit_trips_gdf = trips_gdf[transit_filter]

                        # get the non-public transit trips that are within the walking service area
                        mask = non_public_transit_trips_gdf.within(walk_gdf.geometry)
                        trips_within_walk_service_area_gdf = non_public_transit_trips_gdf[mask]
                        statistics[f'{day}_trip']['possible_conversions']['via_walk'] = len(
                            trips_within_walk_service_area_gdf)

                        # get the non-public transit trips that are within the biking service area
                        mask = non_public_transit_trips_gdf.within(bike_gdf.geometry)
                        trips_within_bike_service_area_gdf = non_public_transit_trips_gdf[mask]
                        statistics[f'{day}_trip']['possible_conversions']['via_bike'] = len(
                            trips_within_bike_service_area_gdf)

                    # get destination building uses for trips that use or could use public transit
                    for day in days:
                        trips_gdf = saturday_trip_filtered if day == 'saturday' else thursday_trip_filtered
                        end_points = as_points(trips_gdf, 'end_lng', 'end_lat')

                        # get the trips that are within the walking service area
                        mask = end_points.within(walk_gdf.geometry.union_all()).reindex(
                            trips_gdf.index, fill_value=False)
                        print(len(trips_gdf))
                        print(len(end_points))
                        print(len(mask))
                        print(len(trips_gdf))
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
                        statistics[f'{day}_trip']['destination_building_use']['via_walk'] = {
                            'type_counts': type_counts__walk.to_dict(),
                            'subtype_counts': subtype_counts__walk.to_dict(),
                        }
                        statistics[f'{day}_trip']['destination_building_use']['via_bike'] = {
                            'type_counts': type_counts__bike.to_dict(),
                            'subtype_counts': subtype_counts__bike.to_dict(),
                        }

                    print(f'  Saving statistics for {area_name}...')
                    statistics_path = os.path.join(
                        self.folder_path,
                        f'{area_name}/statistics/replica__{region}_{year}_{quarter}.json'
                    )
                    os.makedirs(os.path.dirname(statistics_path), exist_ok=True)
                    with open(statistics_path, 'w') as file:
                        json.dump(statistics, file,)

                    # save the filtered data to files
                    print(f'  Saving data for {area_name}...')
                    area_polygon_gdf = geopandas.GeoDataFrame(
                        {'name': [area_name], 'geometry': gdf_union},
                        crs=gdf.crs
                    ).to_crs('EPSG:4326')
                    self._save(
                        area_polygon_gdf,
                        area_name,
                        f'polygon',
                        '',
                        'geojson',
                    )
                    self._save(
                        population_home_filtered,
                        area_name,
                        f'{region}_{year}_{quarter}_home',
                        'population',
                        'geoparquet',
                    )
                    self._save(
                        population_home_filtered,
                        area_name,
                        f'{region}_{year}_{quarter}_home',
                        'population',
                        'geoparquet',
                    )
                    self._save(
                        population_school_filtered,
                        area_name,
                        f'{region}_{year}_{quarter}_school',
                        'population',
                        'geoparquet',
                    )
                    self._save(
                        population_work_filtered,
                        area_name,
                        f'{region}_{year}_{quarter}_work',
                        'population',
                        'geoparquet',
                    )
                    self._save(
                        population_filtered_df,
                        area_name,
                        f'{region}_{year}_{quarter}',
                        'population',
                        'json',
                    )
                    self._save(
                        saturday_trip_filtered,
                        area_name,
                        f'{region}_{year}_{quarter}',
                        'saturday_trip',
                        'geoparquet',
                    )
                    self._save(
                        thursday_trip_filtered,
                        area_name,
                        f'{region}_{year}_{quarter}',
                        'thursday_trip',
                        'geoparquet',
                    )
                    for suffix, gdf in network_segments_subsets:
                        full_table_name = f'{region}_{year}_{quarter}{suffix}'
                        self._save(
                            gdf,
                            area_name,
                            full_table_name,
                            'network_segments',
                            ['geoparquet'],
                        )

                        # try to generate tiles for the network segments
                        print(
                            f'Generating tiles for {area_name} ({region}_{year}_{quarter}{suffix})...')
                        tile_folder_path = os.path.join(
                            self.folder_path, area_name, 'network_segments', full_table_name
                        )
                        try:
                            to_vector_tiles(
                                gdf, f'Network Segments ({area_name}) ({quarter} {year})', full_table_name, tile_folder_path, 16)

                            # zip (no compression) the tiles folder
                            zip_filename = f'{tile_folder_path}.vectortiles'
                            if os.path.exists(zip_filename):
                                os.remove(zip_filename)

                            os.system(
                                f'cd "{tile_folder_path}" && zip -0 -r {os.path.join('../', full_table_name + '.vectortiles')} . > /dev/null')

                        except Exception:
                            # this will happen if the geojson file is empty
                            continue

                        finally:
                            # remove the tiles folder
                            shutil.rmtree(tile_folder_path)

                    print(f'  Finished processing area {area_name}.')

    def _getExpectedParquetFilePaths(self) -> list[str]:
        """Get the expected parquet file paths for the replica data.

        Returns:
            list[str]: A list of expected parquet file paths.
        """
        expected_parquet_files = [
            'full_area/network_segments/{region}_{year}_{quarter}.parquet',
            'full_area/population/{region}_{year}_{quarter}_home.parquet',
            'full_area/population/{region}_{year}_{quarter}_school.parquet',
            'full_area/population/{region}_{year}_{quarter}_work.parquet',
            'full_area/saturday_trip/{region}_{year}_{quarter}.parquet',
            'full_area/thursday_trip/{region}_{year}_{quarter}.parquet',
        ]
        return expected_parquet_files

    def _run_for_network_segments(self, gdf: geopandas.GeoDataFrame, area_name: str) -> None:
        """Loop through network segments tables and run queries to get the data.

        Args:
            gdf (geopandas.GeoDataFrame): _description_
            area_name (str): _description_
            schema_df (pandas.DataFrame): _description_

        Returns:
            list[pandas.DataFrame]: _description_
        """
        # Filter schema_df to only inclue the tables where the table_name column ends with 'segments'
        schema_df = self.tables_to_download_df[self.tables_to_download_df['table_name'].str.endswith(
            'segments')]

        if schema_df is None or schema_df.empty:
            return

        # check if the etl is running in GitHub Actions
        is_running_in_workflow = os.getenv('IS_GH_WORKFLOW', 'false').lower() == 'true'

        for table_name in schema_df['table_name']:
            # Set full_table_path be equal to the table_name column in the schema_df
            full_table_path = f"{self.project_id}.{self.region}.{table_name}"

            print(f'Running query for {full_table_path}...')

            segments_gdf: geopandas.GeoDataFrame | None = None
            if not is_running_in_workflow:
                # run query to get network segments table
                segments_query = f'''
                SELECT stableEdgeId, streetName, geometry, osmid FROM {full_table_path};
                '''
                segments_df = pandas_gbq.read_gbq(
                    segments_query,
                    project_id=self.project_id,
                    dialect='standard',
                    use_bqstorage_api=self.use_bqstorage_api
                )

                if segments_df is None:
                    segments_df = pandas.DataFrame()

                # convert to geodataframe
                geometry_wkt: pandas.Series = segments_df['geometry']
                geometry: geopandas.GeoSeries = geopandas.GeoSeries.from_wkt(
                    geometry_wkt)
                segments_gdf = geopandas.GeoDataFrame(
                    segments_df, geometry=geometry, crs="EPSG:4326")

            if segments_gdf is None:
                segments_gdf = geopandas.GeoDataFrame(
                    {
                        "stableEdgeId": [],
                        "streetName": [],
                        "osmid": [],
                        "geometry": [],
                    },
                    geometry="geometry"
                )

            # save to file
            self._save(
                segments_gdf,
                area_name,
                table_name,
                'network_segments',
                'geoparquet'
            )

            print(f"\nSuccessfully obtained data from {full_table_path}.")

    def _run_for_pop_(self, gdf: geopandas.GeoDataFrame, area_name: str) -> list[pandas.DataFrame]:
        """Loop through population tables and run queries to get the data.

        Args:
            gdf (geopandas.GeoDataFrame): _description_
            area_name (str): _description_
            schema_df (pandas.DataFrame): _description_

        Returns:
            list[pandas.DataFrame]: _description_
        """
        result_dfs: list[pandas.DataFrame] = []

        # Filter schema_df to only inclue the tables where the table_name column ends with 'population'
        schema_df = self.tables_to_download_df[self.tables_to_download_df['table_name'].str.endswith(
            'population')]

        if schema_df is None or schema_df.empty:
            return result_dfs

        for table_name in schema_df['table_name']:
            # Set full_table_path be equal to the table_name column in the schema_df
            full_table_path = f"{self.project_id}.{self.region}.{table_name}"

            print(f'Running query for {full_table_path}...')
            geoseries = geopandas.GeoSeries(gdf['geometry'], crs="EPSG:4326")
            query_geometry = self._prepare_query_geometry(geoseries)

            # Run query to get netowrk segments tables
            pop_query = f'''
            SELECT * FROM {full_table_path} AS pop
            WHERE EXISTS( -- ensure that the subquery returns at least one row
                SELECT 1 -- check for at least one row that satisifes the spatial condition (stop after 1 row for efficiency)
                FROM {query_geometry}
                WHERE
                    ST_COVERS(query_geometry, ST_GEOGPOINT(pop.lng, pop.lat))
            );
            '''
            population_df = pandas_gbq.read_gbq(
                pop_query,
                project_id=self.project_id,
                dialect='standard',
                use_bqstorage_api=self.use_bqstorage_api
            )
            if population_df is None:
                population_df = pandas.DataFrame()
            result_dfs.append(population_df)

            # for each case, convert the lat-lng to a geometry column
            # and save to file
            population_cases = [
                ['home', 'lat', 'lng'],
                ['work', 'lat_work', 'lng_work'],
                ['school', 'lat_school', 'lng_school'],
            ]
            for [case, lat_column, lng_column] in population_cases:
                print(
                    f'Converting geoemtry for population {case} coordinates...')
                population_gdf = geopandas.GeoDataFrame(
                    population_df,
                    geometry=geopandas.points_from_xy(
                        population_df[lng_column], population_df[lat_column]),
                    crs="EPSG:4326"
                )

                print(f'Saving geometry for population ({case})...')
                self._save(
                    population_gdf,
                    area_name,
                    table_name + case,
                    'population',
                    'geoparquet'
                )

            print(f"\nSuccessfully obtained data from {full_table_path}.")

        return result_dfs

    def _run_for_trips(self, gdf: geopandas.GeoDataFrame, area_name: str) -> None:
        """Loop through trip tables and run queries to get the data. This gets trip data for thursday and saturday trips.

        Args:
            gdf (geopandas.GeoDataFrame): _description_
            area_name (str): _description_
            schema_df (pandas.DataFrame): _description_

        Returns:
            list[pandas.DataFrame]: _description_
        """
        results_count = 0

        # Filter schema_df to only inclue the tables where the table_name column ends with 'trip'
        schema_df = self.tables_to_download_df[self.tables_to_download_df['table_name'].str.endswith(
            'trip')]

        if schema_df is None or schema_df.empty:
            return

        def get_trips() -> None:
            table_name = str(season.table_name)

            # Set full_table_path be equal to the table_name column in the schema_df
            full_table_path = f"{self.project_id}.{self.region}.{table_name}"
            # Determine which columns to use based on the table name
            if "2021_Q2" in table_name:
                origin_lng_col = "origin_lng"
                origin_lat_col = "origin_lat"
                dest_lng_col = "destination_lng"
                dest_lat_col = "destination_lat"
            else:
                origin_lng_col = "start_lng"
                origin_lat_col = "start_lat"
                dest_lng_col = "end_lng"
                dest_lat_col = "end_lat"
            table_ldfs = self._run_with_queue(
                gdf, full_table_path=full_table_path,
                origin_lng_col=origin_lng_col, origin_lat_col=origin_lat_col,
                dest_lng_col=dest_lng_col, dest_lat_col=dest_lat_col
            )
            print('Obtained data for table:', table_name)

            network_segments_lookup: dict[str, shapely.LineString] | None = None

            # Determine trip type (e.g., thursday_trip, saturday_trip) from table_name
            # this regex will match the trip type
            trip_type_match = re.search(
                r'_(thursday|saturday)_trip', table_name)
            # If no match is found, default to 'other_trip'
            # this will get the trip type from the regex match
            trip_type = trip_type_match.group(
                0)[1:] if trip_type_match else 'other_trip'

            print(f'Forming trip lines for {table_name}...')
            chunk_count = len(table_ldfs)
            for chunk_index, table_ldf in enumerate(table_ldfs):
                chunk_index = chunk_index + 1  # start chunk index from 1 for more friendly output

                # Convert the lazy frame to a DataFrame
                table_df = table_ldf.collect().to_pandas()

                if not table_df.empty:
                    # add a source_table column with the table name so we can identify the source of the data
                    table_df['source_table'] = table_name

                if network_segments_lookup is None:
                    print(f'  Creating a lookup table for network segments...')
                    network_segments_path = os.path.join(
                        self.folder_path,
                        f'full_area/network_segments/{self.region}_{season.year}_{season.quarter}.parquet'
                    )
                    network_segments_df = geopandas.read_parquet(network_segments_path)
                    network_segments_lookup = create_network_segments_lookup(
                        network_segments_df)
                    del network_segments_df
                    gc.collect()

                print(f'  Processing chunk {chunk_index}/{chunk_count}...')
                trips_gdf = trips_as_lines(table_df, network_segments_lookup, 'EPSG:4326')
                del table_df
                gc.collect()

                print(
                    f'Saving {trip_type} data for {table_name} chunk {chunk_index}/{chunk_count}...')
                self._save(
                    trips_gdf,
                    area_name,
                    f'chunk_{chunk_index}',
                    f'{trip_type}/_chunks/{table_name}',
                    'geoparquet'
                )
                del trips_gdf
                gc.collect()

            del network_segments_lookup
            gc.collect()

            # combine all chunks using pyarrow's parquet dataset
            print(f'Combining all chunks for {table_name}...')
            combined_table_source_folder = os.path.join(
                self.folder_path,
                f'{area_name}/{trip_type}/_chunks/{table_name}'
            )
            dataset = parquet.ParquetDataset(
                combined_table_source_folder
            )
            combined: pyarrow.Table = dataset.read()
            print(f'Converting {table_name} to GeoDataFrame...')
            combined_table_df = combined.to_pandas()
            del combined
            gc.collect()
            combined_table_gdf = geopandas.GeoDataFrame(combined_table_df, crs='EPSG:4326')
            del combined_table_df
            gc.collect()
            print(f'Saving {table_name}...')
            self._save(
                combined_table_gdf,
                area_name,
                table_name,
                trip_type,
                'geoparquet'
            )
            del combined_table_gdf
            gc.collect()

            # delete the chunks folder now that we have combined the chunks
            shutil.rmtree(combined_table_source_folder)

            return None

        # loop through each trip dataset in the schema_df
        # and run the get_trips function in a separate process
        # so that any holds on memory that python creates are
        # released (downloading and processing trip data is memory
        # intensive and pandas_gbq appears hold on to memory)
        for season in schema_df.itertuples():
            process = multiprocessing.Process(target=get_trips)
            process.start()
            process.join()  # wait for the process to finish
            results_count += 1

        print(
            f"\nSuccessfully obtained data from {results_count} trip tables.")

    def _prepare_query_geometry(self, geometry_series: geopandas.GeoSeries) -> str:
        """
        Returns a portion of a SQL query to expose each dissolved polygon of the input
        geometry series. To use in the query, the output of this function should be
        directly included as part of the FROM clause.

        For example:

        ```
        SELECT other_columns, {origin_lng_col}, {origin_lat_col}, {dest_lng_col}, {dest_lat_col}
        FROM table_name, {query_geoemtry}
        WHERE
            ST_COVERS(query_geometry, ST_GEOGPOINT({origin_lng_col}, {origin_lat_col}))
            OR ST_COVERS(query_geometry, ST_GEOGPOINT({dest_lng_col}, {dest_lat_col}));
        ```
        """
        # create a GeoDataFrame from the geometry series
        gdf = geopandas.GeoDataFrame(geometry_series, columns=[
            'geometry'], crs="EPSG:4326")

        # dissolve the GeoDataFrame to create a single geometry
        dissolved_gdf = gdf.dissolve()

        # get the WKT representation of the dissolved geometry
        wkt_list = dissolved_gdf['geometry'].apply(
            lambda x: shapely.wkt.dumps(x)).tolist()

        # prepare the geometry for the query
        prepared_geometry = ''
        for wkt in wkt_list:
            prepared_geometry += f'\nSAFE.ST_GEOGFROMTEXT("{wkt}"), '
        # remove the last comma and space
        prepared_geometry = prepared_geometry[:-2]

        return f'''
            UNNEST([
                {prepared_geometry}
            ]) AS query_geometry
        '''

    def _build_query(self, wkt_list: list[str], full_table_path: str, origin_lng_col: str, origin_lat_col: str,
                     dest_lng_col: str, dest_lat_col: str) -> str:
        '''
        Builds the query to get data from the replica dataset.        
        '''
        # create an UNNEST clause with the geometry
        geometry_series = geopandas.GeoSeries.from_wkt(wkt_list)
        query_geometry = self._prepare_query_geometry(geometry_series)

        return f'''
        SELECT {self.columns_to_select}, {origin_lng_col}, {origin_lat_col}, {dest_lng_col}, {dest_lat_col}
        FROM {full_table_path}
        WHERE EXISTS( -- ensure that the subquery returns at least one row
            SELECT 1 -- check for at least one row that satisifes the spatial condition (stop after 1 row for efficiency)
            FROM {query_geometry}
            WHERE
                ST_COVERS(query_geometry, ST_GEOGPOINT({origin_lng_col}, {origin_lat_col}))
                OR ST_COVERS(query_geometry, ST_GEOGPOINT({dest_lng_col}, {dest_lat_col}))
        );
        '''

    def _run_with_queue(self, gdf_upload: geopandas.GeoDataFrame, full_table_path: str, origin_lng_col: str,
                        origin_lat_col: str, dest_lng_col: str, dest_lat_col: str, max_query_chars: int = 150000) -> list[polars.LazyFrame]:
        queue: list[str] = []
        queue_length = 0
        queries: list[str] = []
        print(f'Generating chunked queries for table {full_table_path}...')
        for _, row in gdf_upload.iterrows():
            # this is a tuple for each row
            wkt = row['geometry_wkt']
            if (wkt == ''):
                continue

            queue_is_full = queue_length + len(wkt) > max_query_chars

            # if the queue is not full, add the row to the queue and continue to the next row
            if (not queue_is_full):
                queue.append(wkt)
                queue_length += len(wkt)
                continue

            # otherwise, generate the query for the current chunk/queue,
            # save it for execution, and then prepare a new chunk/queue
            # before queueing the current row
            query = self._build_query(queue, full_table_path, origin_lng_col,
                                      origin_lat_col, dest_lng_col, dest_lat_col)
            queries.append(query)

            # create a new queue with the current row
            queue = [wkt]
            queue_length = len(wkt)

        # if there is anything left in the queue, create a query for the last chunk
        if len(queue) > 0:
            query = self._build_query(queue, full_table_path, origin_lng_col, origin_lat_col,
                                      dest_lng_col, dest_lat_col)
            queries.append(query)

        print(
            f'Generated {len(queries)} chunked queries for for table {full_table_path}.')

        # create a function that can be run in parallel to execute the queries
        # and collect the results in result_dfs
        result_ldfs: list[polars.LazyFrame] = []
        logger.setLevel(logging.WARNING)

        def process_query(query: str, index: int, num_queries: int) -> None:
            """Process a single query and collect the results in the external result_dfs list.

            Args:
                query (str): _description_
                index (int): _description_

            Raises:
                e: _description_
            """
            print(
                f'Retrieving data for chunk {index + 1} of table {full_table_path}. [{index + 1}/{len(queries)}]')
            try:
                download_cache_folderpath = os.path.join(self.folder_path, 'full_area/download')
                download_cache_filename = f'{full_table_path}__{index + 1}_{num_queries}.parquet'
                download_cache_filepath = os.path.join(
                    download_cache_folderpath, download_cache_filename)
                download_cache_success_filepath = download_cache_filepath.replace(
                    '.parquet', '.success')

                # ensure the cache folder exists
                os.makedirs(download_cache_folderpath, exist_ok=True)

                # check if the a cached version is available
                if os.path.exists(download_cache_filepath) and os.path.exists(download_cache_success_filepath):
                    print(f'Using cached data from {download_cache_filename}')
                    ldf = polars.scan_parquet(download_cache_filepath)
                    result_ldfs.append(ldf)
                    return

                # otherwise, download the data from BigQuery
                df = pandas_gbq.read_gbq(
                    query,
                    project_id=self.project_id,
                    dialect='standard',
                    use_bqstorage_api=self.use_bqstorage_api
                )
                if df is None:
                    df = pandas.DataFrame()

                # convert list types to csv strings (numpy arrays are not supported by parquet)
                columns_to_convert_to_csv = ['transit_route_ids', 'network_link_ids']
                for column in columns_to_convert_to_csv:
                    if column in df.columns:
                        df[column] = df[column].apply(
                            lambda x: ','.join(map(str, x)) if isinstance(x, numpy.ndarray) else x)

                # save a backup/cache of the data upon download that we can use to restore downloaded data
                pandas.DataFrame.to_parquet(
                    df,
                    os.path.join(download_cache_filepath),
                    compression=None  # reduces memory use: no need to compress and uncompress this chunk
                )

                # once the data is saved, write an empty .success file with the same name
                # to indicate that the download was successful
                with open(download_cache_success_filepath, 'w') as f:
                    f.write('')

                # prepare a lazy data frame from polars
                # so that the data does not need to be fully loaded into memory
                # (the trip data can get REALLY large!)
                ldf = polars.scan_parquet(download_cache_filepath)

                result_ldfs.append(ldf)
            except Exception as e:
                print('Failed to execute query')
                raise e

        def handle_query_error(future: Future[None]) -> None:
            """Handle errors that occur during query execution."""
            try:
                future.result()  # This will raise an exception if the query failed
            except Exception as e:
                # stop all processing that has not begun if an error occurs
                for future in futures:
                    future.cancel()

                print(f"Error processing query: {e}")
                raise e

        # run all queries
        futures: list[Future[None]] = []
        with ThreadPoolExecutor() as executor:
            for index, query in enumerate(queries):
                future = executor.submit(process_query, query, index, len(queries))
                future.add_done_callback(handle_query_error)
                futures.append(future)

        # return all results
        logger.setLevel(logging.INFO)
        executor.shutdown(wait=True)  # wait for all futures to finish
        return result_ldfs

    def _run_schema_query(self) -> pandas.DataFrame:
        """
        Returns the schema for the replica dataset.
        """
        query = f'''
        SELECT
            table_name,
            -- Extract 'south_atlantic' from the table name
            'south_atlantic' AS region,
            -- Extract the year (four digits after 'south_atlantic_')
            SPLIT(table_name, '_')[OFFSET(2)] AS year,
            -- Extract the quarter (Q and a digit)
            REGEXP_EXTRACT(table_name, r'_([Qq]\\d)_') AS quarter,
            -- Extract the dataset (the part after the season)
            REGEXP_EXTRACT(table_name, r'_[Qq]\\d_(.*)') AS dataset
        FROM
        `replica-customer.south_atlantic.INFORMATION_SCHEMA.TABLES`;
        '''
        result = pandas_gbq.read_gbq(
            query, project_id=self.project_id, dialect='standard', progress_bar_type='None')

        if result is None or result.empty:
            raise ValueError("No tables found in the replica dataset schema.")

        # only keep network_segments, population, thursday_trip, and saturday_trip tables
        mask = result['table_name'].str.contains(
            'network_segments|population|thursday_trip|saturday_trip')
        result = result[mask].reset_index(drop=True)

        return result

    def query_schema(self, years_filter: Optional[list[int]] = None, quarters_filter: Optional[list[Literal['Q2', 'Q4']]] = None) -> pandas.DataFrame:
        """Gets a dataframe of available replica datasets.

        If not authenticated (or the schema query fails), it will attempt
        to read the downloaded `full_area` files to construct a schema. This
        allows running the ETL without needing to authenticate with BigQuery
        by providing the downloaded `full_area` files in the output data
        folder.

        Returns:
            pandas.DataFrame: A pandas data frame containing columns `table_name`, `region`, `year`, `quarter`, `dataset`
        """
        inferred_schema_df = self.infer_schema(strict=True)

        new_seasons_schema_df: pandas.DataFrame
        if pandas_gbq.context.credentials:
            schema_df = self._run_schema_query()

            # skip seasons that are already downloaded (they are in the inferred schema)
            # by removing table names from schema_df if the table name is in the inferred schema
            name_is_in_inferred_schema_mask = schema_df['table_name'].isin(
                inferred_schema_df['table_name'])
            filtered_schema_df = schema_df[~name_is_in_inferred_schema_mask].reset_index(drop=True)

            skipped_schema_df = schema_df[name_is_in_inferred_schema_mask].reset_index(drop=True)
            skipped_table_names = skipped_schema_df['table_name'].tolist()

            for skipped_table_name in skipped_table_names:
                print(f"  Skipping already downloaded table: {skipped_table_name}")

            new_seasons_schema_df = filtered_schema_df
        else:
            # if not authenticated, use the inferred schema
            new_seasons_schema_df = inferred_schema_df

        # filter the schema by the years and quarters if provided
        if years_filter is not None:
            mask = new_seasons_schema_df['year'].astype(int).isin(years_filter)
            new_seasons_schema_df = new_seasons_schema_df[mask]
        if quarters_filter is not None:
            mask = new_seasons_schema_df['quarter'].isin(quarters_filter)
            new_seasons_schema_df = new_seasons_schema_df[mask]

        return new_seasons_schema_df.reset_index(drop=True)

    def infer_schema(self, years_filter: Optional[list[int]] = None, quarters_filter: Optional[list[Literal['Q2', 'Q4']]] = None, strict: bool = False) -> pandas.DataFrame:
        """Infer the schema table from the downloaded full_area files.

        Returns:
            pandas.DataFrame: A pandas data frame containing columns `table_name`, `region`, `year`, `quarter`, `dataset`
        """
        full_area_path = os.path.join(self.folder_path, 'full_area')
        if not os.path.exists(full_area_path):
            return pandas.DataFrame(columns=['table_name', 'region', 'year', 'quarter', 'dataset'])

        # find the available tables in the full_area folder
        inferred_schema_rows = []
        for root, _, files in os.walk(full_area_path):
            for filename in files:
                if root.endswith('download') or '_chunks' in root:
                    # skip the download cache folder or any chunks folders
                    continue

                if filename.endswith('.parquet'):

                    # extract the table info from the file path
                    relative_path = os.path.relpath(
                        os.path.join(root, filename), full_area_path)
                    [dataset, partial_table_name] = relative_path.split(os.sep)

                    # remove suffixes
                    partial_table_name = partial_table_name\
                        .replace('.parquet', '')\
                        .replace('_home', '')\
                        .replace('_school', '')\
                        .replace('_work', '')\
                        .replace('_dest', '')\
                        .replace('_origin', '')

                    # extract the parts of the table name
                    parts = partial_table_name.split('_')
                    quarter = parts[-1]
                    year = parts[-2]
                    region = '_'.join(parts[0:-2])

                    if years_filter is not None and int(year) not in years_filter:
                        continue

                    if quarters_filter is not None and quarter not in quarters_filter:
                        continue

                    inferred_schema_rows.append({
                        'table_name': f'{region}_{year}_{quarter}_{dataset}',
                        'region': region,
                        'year': year,
                        'quarter': quarter,
                        'dataset': dataset,
                    })

        # convert the found table information to a DataFrame
        if inferred_schema_rows:
            inferred_schema_df = pandas.DataFrame(inferred_schema_rows).drop_duplicates([
                'table_name']).reset_index(drop=True)

            inferred_seasons = inferred_schema_df\
                .drop(columns=['table_name', 'dataset'])\
                .drop_duplicates()\
                .reset_index(drop=True)

            # ensure that all parquet files exist for each dataset
            # (used when we need to know which seasons have all data available)
            if strict:
                expected_parquet_files = self._getExpectedParquetFilePaths()
                for season in inferred_seasons.itertuples():
                    for expected_filename_template in expected_parquet_files:
                        expected_filename = expected_filename_template.format(
                            region=season.region, year=season.year, quarter=season.quarter)
                        full_expected_path = os.path.join(
                            self.folder_path, expected_filename)

                        # if a file is missing, remove the season from the inferred schema
                        if not os.path.exists(full_expected_path):
                            dataset = expected_filename.split(os.sep)[-2]
                            table_name = f'{season.region}_{season.year}_{season.quarter}_{dataset}'
                            inferred_schema_df = inferred_schema_df[
                                inferred_schema_df['table_name'] != table_name
                            ].reset_index(drop=True)

        else:
            # If no files found, return an empty DataFrame with the expected columns
            inferred_schema_df = pandas.DataFrame(
                columns=['table_name', 'region', 'year', 'quarter', 'dataset'])

        return inferred_schema_df

    def _save(self, gdf: geopandas.GeoDataFrame, area_name: str, full_table_name: str, table_alias: str, format: Literal['geoparquet', 'json', 'geojson'] | list[Literal['geoparquet', 'json', 'geojson']]) -> None:
        # if format is a list, call this function for each format in the list
        if isinstance(format, list):
            for fmt in format:
                self._save(gdf, area_name, full_table_name, table_alias, fmt)
            return

        # build the output name
        output_name = full_table_name\
            .replace('.', ' ')\
            .replace(table_alias, '')\
            .replace('_', ' ')\
            .strip()\
            .replace(' ', '_')

        # ensure output folder exists
        output_folder = os.path.join(
            self.folder_path,
            area_name,
            table_alias
        )
        os.makedirs(output_folder, exist_ok=True)

        # save to file
        output_path = os.path.join(output_folder, output_name)
        if format == 'geoparquet':
            has_bbox_column = 'bbox' in gdf.columns
            gdf.to_parquet(output_path + '.parquet',
                           write_covering_bbox=not has_bbox_column, geometry_encoding='WKB', schema_version='1.1.0', compression=None)
            print(f'Saved results to {output_path}.parquet')
        if format == 'geojson':
            gdf.to_crs('EPSG:4326').to_file(output_path + '.geojson', driver='GeoJSON')
            print(f'Saved results to {output_path}.parquet')
        if format == 'json':
            df = pandas.DataFrame(gdf.drop(columns='geometry', errors='ignore'))
            df.to_json(output_path + '.json', orient='records', indent=2)
            print(f'Saved results to {output_path}.json')
