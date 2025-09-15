import gc
import json
import logging
import multiprocessing
import os
import re
import shutil
import time
from concurrent.futures import Future, ThreadPoolExecutor
from pathlib import Path
from typing import Any, Literal, Optional, cast

import dask.dataframe
import geopandas
import numpy
import pandas
import pandas_gbq
import polars
import shapely
import shapely.wkt
from tqdm import tqdm
from tqdm.contrib.logging import logging_redirect_tqdm

from etl.sources.replica.readers.partitions_to_gdf import partitions_to_gdf
from etl.sources.replica.transformers.as_points import as_points
from etl.sources.replica.transformers.count_segment_frequency import \
    count_segment_frequency
from etl.sources.replica.transformers.to_vector_tiles import to_vector_tiles
from etl.sources.replica.transformers.trips_as_lines import (
    create_network_segments_lookup, trips_as_lines)

gbq_logger = logging.getLogger('pandas_gbq')
gbq_logger.setLevel(logging.INFO)
gbq_logger.addHandler(logging.StreamHandler())

logger = logging.getLogger('replica_etl')
logger.setLevel(logging.DEBUG)


class ReplicaETL:
    project_id = 'replica-customer'
    region = 'south_atlantic'
    input_folder_path = './input/replica_interest_area_polygons'
    folder_path = './data/replica'
    greenlink_gtfs_folder_path = './data/greenlink_gtfs'
    columns_to_select = 'household_id'
    use_bqstorage_api = os.getenv('USE_BIGQUERY_STORAGE_API', '0') == '1'
    include_full_area_in_areas = os.getenv('INCLUDE_FULL_AREA_IN_AREAS', '0') == '1'

    years_filter: Optional[list[int]] = None
    quarters_filter: Optional[list[Literal['Q2', 'Q4']]] = None

    def __init__(self, columns: list[str], years: Optional[list[int]] = None, quarters: Optional[list[Literal['Q2', 'Q4']]] = None) -> None:
        """
        Initializes the replica ETL with a sepecific dataset and columns from that
        dataset.
        """
        self.years_filter = years
        self.quarters_filter = quarters

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
            self._run_for_network_segments(area_name)
            # get population data
            self._run_for_pop_(dissolved_gdf, area_name)
            # get trip data (thursday and saturday trips)
            self._run_for_trips(gdf, area_name)

            print(f"\n\nSuccessfully downloaded data for {area_name}.")

        if mode == 'process':
            # determine the requested seasons
            # (get a dataframe of each unique set of region, year, and quarter)
            seasons = self.infer_schema(self.years_filter, self.quarters_filter).drop(
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
            geojson_filepaths = [
                os.path.join(self.input_folder_path, filename) for filename in geojson_filenames]

            # import locally so that it does not cause circular import issues
            from etl.sources.replica.process_etl import (ReplicaProcessETL,
                                                         Season)

            # reformat seasons to a list of Season dictionaries
            seasons_dicts: list[Season] = []
            for season in seasons.itertuples():
                seasons_dicts.append(Season(
                    region=str(season.region),
                    year=int(str(season.year)),
                    quarter=str(season.quarter),
                ))
            seasons_dicts = sorted(
                seasons_dicts,
                key=lambda s: (s['region'], s['year'], int(s['quarter'].strip("Q")))
            )

            # if the full_area should be included, add it to the area paths
            if self.include_full_area_in_areas:
                geojson_filepaths.append(full_area_path)

            # process the data for each season and area
            ReplicaProcessETL(
                self,
                seasons_dicts,
                geojson_filepaths,
                {
                    'population_home': expected_parquet_files[1],
                    'population_school': expected_parquet_files[2],
                    'population_work': expected_parquet_files[3],
                    'bike_service_area': os.path.join(
                        self.greenlink_gtfs_folder_path,
                        '{year}/{quarter}/bike_service_area.geojson',
                    ),
                    'walk_service_area': os.path.join(
                        self.greenlink_gtfs_folder_path,
                        '{year}/{quarter}/walk_service_area.geojson',
                    ),
                    'thursday_trip': (Path(os.path.join(
                        expected_parquet_files[4]
                    )).parent / '_chunks' / '{region}_{year}_{quarter}_thursday_trip').as_posix(),
                    'saturday_trip': '',  # saturday trip data is not currently processed
                    # 'saturday_trip':  (Path(os.path.join(
                    #     expected_parquet_files[5]
                    # )).parent / '_chunks' / '{region}_{year}_{quarter}_saturday_trip').as_posix(),
                },
                days=['thursday']
            ).process()

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
            'full_area/thursday_trip/{region}_{year}_{quarter}.success',
            # 'full_area/saturday_trip/{region}_{year}_{quarter}.success',
        ]
        return expected_parquet_files

    def _run_for_network_segments(self, area_name: str) -> None:
        """Loop through network segments tables and run queries to get the data.

        Args:
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

        def get_segments(table_name: str) -> None:
            # Set full_table_path be equal to the table_name column in the schema_df
            full_table_path = f"{self.project_id}.{self.region}.{table_name}"

            print(f'\nRunning query for {full_table_path}...')

            segments_gdf: geopandas.GeoDataFrame | None = None
            if not is_running_in_workflow:
                # run query to get network segments table
                segments_query = f'''
                SELECT stableEdgeId, streetName, geometry, osmid FROM {full_table_path};
                '''
                with logging_redirect_tqdm():
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
            print(f'  Saving...')
            self._save(
                segments_gdf,
                area_name,
                table_name,
                'network_segments',
                'geoparquet'
            )

            print(f"\nSuccessfully obtained data from {full_table_path}.")

        results_count = 0
        for season in schema_df.itertuples():
            # run in a separate process because pandas_gbq uses a rediculous amount of RAM and
            # never releases it unless the process is killed (~4 GB uncompressed data becomes
            # ~35 GB RAM usage)
            process = multiprocessing.Process(target=get_segments, args=(season.table_name,))
            process.start()
            process.join()  # wait for the process to finish
            process.close()
            results_count += 1

        print(
            f"\nSuccessfully obtained data from {results_count} network segments table{'' if results_count == 1 else 's'}.")

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

            # skip when the query geometry is empty
            if query_geometry is None:
                continue

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
            with logging_redirect_tqdm():
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
            table_ddf = self._run_with_queue(
                gdf, full_table_path=full_table_path,
                origin_lng_col=origin_lng_col, origin_lat_col=origin_lat_col,
                dest_lng_col=dest_lng_col, dest_lat_col=dest_lat_col
            )
            table_partitions = table_ddf.to_delayed()
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

            # Define the output folder and ensure it exists
            output_folder = os.path.join(
                self.folder_path,
                area_name,
                f'{trip_type}/_chunks/{table_name}'
            )
            os.makedirs(output_folder, exist_ok=True)

            def save_geodataframe(trips_gdf: geopandas.GeoDataFrame, output_path: str) -> None:
                has_bbox_column = 'bbox' in gdf.columns
                trips_gdf.to_parquet(output_path, write_covering_bbox=not has_bbox_column,
                                     geometry_encoding='WKB', schema_version='1.1.0', compression='snappy')
                # tqdm.write(f'  Saved chunk to {output_path}')

            print(f'Forming trip lines for {table_name}...')
            chunk_count = len(table_partitions)
            features_to_process = table_ddf.shape[0].compute()
            bar = tqdm(
                total=features_to_process,
                desc=f'Forming trip lines for {table_name}',
                unit="features"
            )
            with logging_redirect_tqdm(), ThreadPoolExecutor(max_workers=1) as executor:
                futures: list[Future[None]] = []

                for chunk_index, delayed_partition in enumerate(table_partitions):
                    chunk_index = chunk_index + 1  # start chunk index from 1 for more friendly output

                    # convert the partition to a DataFrame
                    bar.write(f'  Converting chunk {chunk_index}/{chunk_count} to DataFrame...')
                    table_df: pandas.DataFrame = delayed_partition.compute()

                    if 'origin_lng' in table_df.columns:
                        # rename the columns to match the expected columns
                        table_df.rename(columns={
                            'origin_lng': 'start_lng',
                            'origin_lat': 'start_lat',
                            'destination_lng': 'end_lng',
                            'destination_lat': 'end_lat'
                        }, inplace=True)

                    if not table_df.empty:
                        # add a source_table column with the table name so we can identify the source of the data
                        table_df['source_table'] = table_name

                    if network_segments_lookup is None:
                        bar.write(
                            f'  Creating a lookup table for network segments (this may take a while)...')
                        network_segments_path = os.path.join(
                            self.folder_path,
                            f'full_area/network_segments/{self.region}_{season.year}_{season.quarter}.parquet'
                        )
                        network_segments_df = geopandas.read_parquet(network_segments_path)
                        network_segments_lookup = create_network_segments_lookup(
                            network_segments_df)
                        del network_segments_df
                        gc.collect()

                    bar.write(f'  Processing chunk {chunk_index}/{chunk_count}...')
                    trips_gdf = trips_as_lines(table_df, network_segments_lookup, 'EPSG:4326', bar)
                    del table_df
                    gc.collect()

                    # bar.write(
                    #     f'  Saving {trip_type} data for {table_name} chunk {chunk_index}/{chunk_count} in the background...')

                    # Define the output path
                    output_path = os.path.join(output_folder, f'chunk_{chunk_index}.parquet')

                    # Save the GeoDataFrame to a parquet file in a separate thread
                    future = executor.submit(save_geodataframe, trips_gdf, output_path)
                    futures.append(future)

                    # since the separate thread has its own reference to trips_gdf that it will
                    # clean up when finished, we can go ahead and delete it here
                    del trips_gdf
                    gc.collect()

                del network_segments_lookup
                gc.collect()

                # wait for all submitted futures to complete saving
                for index, future in enumerate(futures):
                    try:
                        future.result()  # this will block until the future is completed
                    except Exception as e:
                        print(f"Error saving for chunk {index}: {e}")
                bar.close()

            # create a .success file to indicate that the chunks have been successfully created
            print(f'Flagging {table_name} chunks as complete...')
            success_file_path = os.path.join(
                self.folder_path, f'{area_name}/{trip_type}/{self.region}_{season.year}_{season.quarter}.success')
            with open(success_file_path, 'w') as success_file:
                success_file.write('\n')

            print(f'  Finished processing {table_name}.')
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
            process.close()
            results_count += 1

        print(
            f"\nSuccessfully obtained data from {results_count} trip tables.")

    def _prepare_query_geometry(self, geometry_series: geopandas.GeoSeries) -> str | None:
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

        # return early if the geoemtry is empty
        if len(wkt_list) == 0:
            return None

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
                     dest_lng_col: str, dest_lat_col: str) -> str | None:
        '''
        Builds the query to get data from the replica dataset.        
        '''
        # create an UNNEST clause with the geometry
        geometry_series = geopandas.GeoSeries.from_wkt(wkt_list)
        query_geometry = self._prepare_query_geometry(geometry_series)
        if query_geometry is None:
            return None

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
                        origin_lat_col: str, dest_lng_col: str, dest_lat_col: str, max_query_chars: int = 150000) -> dask.dataframe.DataFrame:
        download_cache_folderpath = os.path.join(self.folder_path, 'full_area/download')

        queue: list[str] = []
        queue_length = 0
        queries: list[str] = []
        queue_considered_count = 0
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
            queue_considered_count += 1
            if query is None:
                print(
                    f'Skipping query {queue_considered_count} for {full_table_path} because the query geometry is empty.')
                continue
            queries.append(query)

            # create a new queue with the current row
            queue = [wkt]
            queue_length = len(wkt)

        # if there is anything left in the queue, create a query for the last chunk
        if len(queue) > 0:
            query = self._build_query(queue, full_table_path, origin_lng_col, origin_lat_col,
                                      dest_lng_col, dest_lat_col)
            queue_considered_count += 1
            if query is None:
                print(
                    f'Skipping last query ({queue_considered_count}) for {full_table_path} because the query geometry is empty.')
            else:
                queries.append(query)

        print(
            f'Generated {len(queries)} chunked queries for for table {full_table_path}.')

        # create a function that can be run in parallel to execute the queries
        # and collect the results in result_dfs
        result_ldfs: list[polars.LazyFrame] = []
        chunk_paths: list[str] = []
        gbq_logger.setLevel(logging.WARNING)

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
                    chunk_paths.append(download_cache_filepath)
                    return

                # otherwise, download the data from BigQuery
                with logging_redirect_tqdm():
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
                    compression='snappy'
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
                chunk_paths.append(download_cache_filepath)
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
        gbq_logger.setLevel(logging.INFO)

        # wait for all futures to finish
        executor.shutdown(wait=True)

        # repartition each chunk to 100 MB each
        print('Repartitioning chunks to 100 MB each...')
        chunks_ddf = cast(dask.dataframe.DataFrame, dask.dataframe.read_parquet(chunk_paths))
        repartitioned_ddf = cast(dask.dataframe.DataFrame,
                                 chunks_ddf.repartition(partition_size='100MB'))

        # return all results
        return repartitioned_ddf

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
        with logging_redirect_tqdm():
            result = pandas_gbq.read_gbq(
                query, project_id=self.project_id, dialect='standard', progress_bar_type='None')

        if result is None or result.empty:
            raise ValueError("No tables found in the replica dataset schema.")

        # only keep network_segments, population, and thursday_trip tables
        mask = result['table_name'].str.contains(
            'network_segments|population|thursday_trip')
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
        inferred_schema_df = self.infer_schema(years_filter, quarters_filter, strict=True)

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

                if filename.endswith('.parquet') or filename.endswith('.success'):

                    # extract the table info from the file path
                    relative_path = os.path.relpath(
                        os.path.join(root, filename), full_area_path)
                    [dataset, partial_table_name] = relative_path.split(os.sep)

                    # remove suffixes
                    partial_table_name = partial_table_name\
                        .replace('.parquet', '')\
                        .replace('.success', '')\
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

    def _save(self, gdf: geopandas.GeoDataFrame | pandas.DataFrame, area_name: str, full_table_name: str, table_alias: str, format: Literal['geoparquet', 'json', 'geojson'] | list[Literal['geoparquet', 'json', 'geojson']], log_prefix: str = '') -> None:
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

        # require geodataframe for goeparquet and geojson formats
        if format in ['geoparquet', 'geojson'] and not isinstance(gdf, geopandas.GeoDataFrame):
            raise ValueError(
                f"Expected a GeoDataFrame for format '{format}', but got {type(gdf)}. "
                "Please convert the DataFrame to a GeoDataFrame before saving."
            )

        # save to file
        output_path = os.path.join(output_folder, output_name)
        if format == 'geoparquet' and isinstance(gdf, geopandas.GeoDataFrame):
            has_bbox_column = 'bbox' in gdf.columns
            gdf.to_parquet(output_path + '.parquet',
                           write_covering_bbox=not has_bbox_column, geometry_encoding='WKB', schema_version='1.1.0', compression='snappy')
            logger.info(f'{log_prefix}Saved results to {output_path}.parquet')
        if format == 'geojson' and isinstance(gdf, geopandas.GeoDataFrame):
            gdf.to_crs('EPSG:4326').to_file(output_path + '.geojson', driver='GeoJSON')
            logger.info(f'{log_prefix}Saved results to {output_path}.parquet')
        if format == 'json':
            df = pandas.DataFrame(gdf.drop(columns='geometry', errors='ignore'))
            df.to_json(output_path + '.json', orient='records', indent=2)
            logger.info(f'{log_prefix}Saved results to {output_path}.json')
