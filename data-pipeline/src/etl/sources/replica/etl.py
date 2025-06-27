import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Literal, Optional

import geopandas
import pandas
import pandas_gbq
import shapely
import shapely.wkt

logger = logging.getLogger('pandas_gbq')
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())


class ReplicaETL:
    project_id = 'replica-customer'
    region = 'south_atlantic'
    input_folder_path = './input/replica_interest_area_polygons'
    folder_path = './data/replica'
    output_folder_path = './data/replica/Greenville County'
    columns_to_select = 'household_id'
    clip_boundary = False
    use_bqstorage_api = False

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

        # Get the schema for the replica dataset
        self.schema_df = self.schema_query()
        if years is not None:
            mask = self.schema_df['year'].astype(int).isin(years)
            self.schema_df = self.schema_df[mask]
        if quarters is not None:
            mask = self.schema_df['quarter'].isin(quarters)
            self.schema_df = self.schema_df[mask]

    def run(self):
        # get all geojson files from the input folder
        input_filenames = os.listdir(self.input_folder_path)

        geojson_filename = [
            filename for filename in input_filenames if filename.endswith('.geojson')]
        # List of files in the output folder
        file_list = self.list_files_in_folders(self.output_folder_path)

        # process each geojson file
        for filename in geojson_filename:
            print(f'Processing {filename}...')
            # extract the area name from the filename
            area_name = os.path.splitext(filename)[0]

            # open the geojson file
            gdf = geopandas.read_file(os.path.join(
                self.input_folder_path, filename)).to_crs(epsg=4326)

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

            # if the clip_boundary is set to True, clip the gdf to the geometry
            if self.clip_boundary:
                # clip county-wide data to neighborhood boundaries
                for file in file_list:
                    # Check if the file is a GeoJSON file
                    if file.endswith('.json'):
                        # Read the JSON file into a GeoDataFrame
                        output_gdf = geopandas.read_file(file)
                        # Clip the output_gdf to the gdf geometry
                        clipped_gdf = geopandas.clip(output_gdf, gdf)
                        # Save the clipped GeoDataFrame to a new file
                        output_filename = os.path.join(
                            self.output_folder_path, area_name + '_' + os.path.basename(filename))
                        clipped_gdf.to_file(output_filename, driver='GeoJSON')
                        print(f"Clipped results saved to {output_filename}")
            else:
                # # Getting network segments data
                # segments_df = self._run_for_network_segments(
                #     dissolved_gdf, area_name, self.schema_df)
                # # Getting Replica population data
                # pop_df = self._run_for_pop_(
                #     dissolved_gdf, area_name, self.schema_df)
                # Getting Replica trip data
                trips_df = self._run_for_trips(gdf, area_name, self.schema_df)

    def _run_for_network_segments(self, gdf: geopandas.GeoDataFrame, area_name: str, schema_df: pandas.DataFrame) -> list[pandas.DataFrame]:
        """Loop through network segments tables and run queries to get the data.

        Args:
            gdf (geopandas.GeoDataFrame): _description_
            area_name (str): _description_
            schema_df (pandas.DataFrame): _description_

        Returns:
            list[pandas.DataFrame]: _description_
        """
        result_dfs: list[pandas.DataFrame] = []

        # Filter schema_df to only inclue the tables where the table_name column ends with 'segments'
        schema_df = schema_df[schema_df['table_name'].str.endswith('segments')]

        if schema_df is None or schema_df.empty:
            print("No network segments tables found to process queries.")
            return result_dfs

        for table_name in schema_df['table_name']:
            # Set full_table_path be equal to the table_name column in the schema_df
            full_table_path = f"{self.project_id}.{self.region}.{table_name}"

            print(f'Running query for {full_table_path}...')
            geoseries = geopandas.GeoSeries(gdf['geometry'], crs="EPSG:4326")
            query_geometry = self._prepare_query_geometry(geoseries)

            # run query to get network segments table
            segments_query = f'''
            SELECT * FROM {full_table_path}
            WHERE EXISTS( -- ensure that the subquery returns at least one row
                SELECT 1 -- check for at least one row that satisifes the spatial condition (stop after 1 row for efficiency)
                FROM {query_geometry}
                WHERE
                    ST_COVERS(query_geometry, ST_GEOGPOINT(startLon, startLat))
                    OR ST_COVERS(query_geometry, ST_GEOGPOINT(endLon, endLat))
            );
            '''
            segments_df = pandas_gbq.read_gbq(
                segments_query,
                project_id=self.project_id,
                dialect='standard',
                use_bqstorage_api=self.use_bqstorage_api
            )
            if segments_df is None:
                segments_df = pandas.DataFrame()
            result_dfs.append(segments_df)

            # convert to geodataframe
            geometry_wkt: pandas.Series = segments_df['geometry']
            geometry: geopandas.GeoSeries = geopandas.GeoSeries.from_wkt(
                geometry_wkt)
            segments_gdf = geopandas.GeoDataFrame(
                segments_df, geometry=geometry, crs="EPSG:4326")

            # save to file
            self._save(
                segments_gdf,
                area_name,
                table_name,
                'network_segments',
                'geoparquet'
            )

            print(f"\nSuccessfully obtained data from {full_table_path}.")

        return result_dfs

    def _run_for_pop_(self, gdf: geopandas.GeoDataFrame, area_name: str, schema_df: pandas.DataFrame) -> list[pandas.DataFrame]:
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
        schema_df = schema_df[schema_df['table_name'].str.endswith(
            'population')]

        if schema_df is None or schema_df.empty:
            print("No population tables found to process queries.")
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

    def _run_for_trips(self, gdf: geopandas.GeoDataFrame, area_name: str, schema_df: pandas.DataFrame) -> list[pandas.DataFrame]:
        """Loop through trip tables and run queries to get the data. This gets trip data for thursday and saturday trips.

        Args:
            gdf (geopandas.GeoDataFrame): _description_
            area_name (str): _description_
            schema_df (pandas.DataFrame): _description_

        Returns:
            list[pandas.DataFrame]: _description_
        """
        all_trip_results: list[pandas.DataFrame] = []

        # Filter schema_df to only inclue the tables where the table_name column ends with 'trip'
        schema_df = self.schema_df[schema_df['table_name'].str.endswith(
            'trip')]

        if schema_df is None or schema_df.empty:
            print("No trip tables found to process queries.")
            return all_trip_results

        for table_name in schema_df['table_name']:
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
            table_df = self._run_with_queue(
                gdf, full_table_path=full_table_path,
                origin_lng_col=origin_lng_col, origin_lat_col=origin_lat_col,
                dest_lng_col=dest_lng_col, dest_lat_col=dest_lat_col
            )
            if not table_df.empty:
                # Add a column to identify the source table
                table_df['source_table'] = table_name
                all_trip_results.append(table_df)

                # Determine trip type (e.g., thursday_trip, saturday_trip) from table_name
                # this regex will match the trip type
                trip_type_match = re.search(
                    r'_(thursday|saturday)_trip', table_name)
                # If no match is found, default to 'other_trip'
                # this will get the trip type from the regex match
                trip_type = trip_type_match.group(
                    0)[1:] if trip_type_match else 'other_trip'

                # for each case, convert the lat-lng to a geometry column
                # and save to file
                trip_cases = [
                    ['origin', origin_lat_col, origin_lng_col],
                    ['dest', dest_lat_col, dest_lng_col],
                ]
                for [case, lat_column, lng_column] in trip_cases:
                    print(
                        f'Converting geoemtry for {trip_type} {case} coordinates...')
                    trip_gdf = geopandas.GeoDataFrame(
                        table_df,
                        geometry=geopandas.points_from_xy(
                            table_df[lng_column], table_df[lat_column]),
                        crs="EPSG:4326"
                    )

                    print(f'Saving geometry for {trip_type} ({case})...')
                    self._save(
                        trip_gdf,
                        area_name,
                        table_name + case,
                        trip_type,
                        'geoparquet'
                    )

        print(
            f"\nSuccessfully obtained data from {len(all_trip_results)} trip tables.")
        return all_trip_results

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
        prepared_gemmetry = ''
        for wkt in wkt_list:
            prepared_gemmetry += f'\nSAFE.ST_GEOGFROMTEXT("{wkt}"), '
        # remove the last comma and space
        prepared_gemmetry = prepared_gemmetry[:-2]

        return f'''
            UNNEST([
                {prepared_gemmetry}
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
                        origin_lat_col: str, dest_lng_col: str, dest_lat_col: str, max_query_chars: int = 150000) -> pandas.DataFrame:
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
        result_dfs: list[pandas.DataFrame] = []
        logger.setLevel(logging.WARNING)

        def process_query(query: str, index: int) -> None:
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
                df = pandas_gbq.read_gbq(
                    query,
                    project_id=self.project_id,
                    dialect='standard',
                    use_bqstorage_api=self.use_bqstorage_api
                )
                if df is None:
                    df = pandas.DataFrame()
                result_dfs.append(df)
            except Exception as e:
                print('Failed to execute query')
                raise e

        # run all queries
        with ThreadPoolExecutor() as executor:
            for index, query in enumerate(queries):
                executor.submit(process_query, query, index)

        # Merge all results
        logger.setLevel(logging.INFO)
        executor.shutdown(wait=True)  # wait for all futures to finish
        return pandas.concat(result_dfs, ignore_index=True)

    def schema_query(self) -> pandas.DataFrame:
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
            query, project_id=self.project_id, dialect='standard')

        if result is None or result.empty:
            raise ValueError("No tables found in the replica dataset schema.")

        return result

    def list_files_in_folders(self, root_folder):
        all_files = []
        for folder_path, _, files in os.walk(root_folder):
            for file in files:
                file_path = os.path.join(folder_path, file)
                all_files.append(file_path)
        return all_files

    def _save(self, gdf: geopandas.GeoDataFrame, area_name: str, full_table_name: str, table_alias: str, format: Literal['geoparquet', 'json']) -> None:
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
            gdf.to_parquet(output_path + '.geoparquet')
            print(f'Saved results to {output_path}.geoparquet')
        if format == 'json':
            gdf.to_json(output_path + '.json', orient='records', indent=2)
            print(f'Saved results to {output_path}.json')

# Function to clip Greenville City trips, network segments, and population data to the boundaries of different neighborhoods
