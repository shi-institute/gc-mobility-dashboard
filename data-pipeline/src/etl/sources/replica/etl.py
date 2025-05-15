import logging
import os
import re
from typing import Optional

import geopandas
import pandas
import pandas_gbq
import shapely

logger = logging.getLogger('pandas_gbq')
logger.setLevel(logging.DEBUG)
logger.addHandler(logging.StreamHandler())


class ReplicaETL:
    project_id = 'replica-customer'
    region = 'south_atlantic'
    input_folder_path = './input/replica_interest_area_polygons'
    folder_path = './data/replica'
    columns_to_select = 'household_id'

    def __init__(self, columns: list[str], years: Optional[int] = None, quarters: Optional[str] = None) -> None:
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

        # process each geojson file
        for filename in geojson_filename:
            print(f'Processing {filename}...')
            # extract the area name from the filename
            area_name = os.path.splitext(filename)[0]

            # open the geojson file
            gdf = geopandas.read_file(os.path.join(
                self.input_folder_path, filename)).to_crs(epsg=4326)

            # set the name column to the area name
            # and discard all other columns
            gdf['name'] = area_name
            gdf = gdf[['name', 'geometry']].copy()
            # get the geometry in wkt format
            gdf['geometry_wkt'] = gdf['geometry'].apply(
                lambda x: shapely.wkt.dumps(x))

            # Getting Replica trip data
            trips_df = self._run_for_trips(gdf, area_name, self.schema_df)
            # Getting network segments data
            segments_df = self._run_for_network_segments(
                gdf, area_name, self.schema_df)
            # Getting Replica population data
            pop_df = self._run_for_pop_(gdf, area_name, self.schema_df)

    def _run_for_trips(self, gdf: geopandas.GeoDataFrame, area_name: str, schema_df: pandas.DataFrame) -> pandas.DataFrame:
        # Loop through trip tables and run queries
        all_trip_results = []
        table_df = pandas.DataFrame()
        # Filter schema_df to only inclue the tables where the table_name column ends with 'trip'
        schema_df = self.schema_df[schema_df['table_name'].str.endswith(
            'trip')]

        if schema_df is not None and not schema_df.empty:
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
                table_df = self._run_with_queue(gdf, full_table_path=full_table_path, max_query_chars=1000000,
                                                origin_lng_col=origin_lng_col, origin_lat_col=origin_lat_col,
                                                dest_lng_col=dest_lng_col, dest_lat_col=dest_lat_col)
                if not table_df.empty:
                    # Add a column to identify the source table
                    table_df['source_table'] = table_name
                    all_trip_results.append(table_df)
                    # Build output path with both area_name and table_name
                    # Determine trip type (e.g., thursday_trip, saturday_trip) from table_name
                    # this regex will match the trip type
                    trip_type_match = re.search(
                        r'_(thursday|saturday)_trip', table_name)
                    # If no match is found, default to 'other_trip'
                    # this will get the trip type from the regex match
                    trip_type = trip_type_match.group(
                        0)[1:] if trip_type_match else 'other_trip'
                    # Build directory path dynamically
                    area_folder_path = os.path.join(
                        self.folder_path, area_name, trip_type)
                    os.makedirs(area_folder_path, exist_ok=True)
                    # Create a safe filename and final output path
                    safe_table_name = table_name.replace('.', '_')
                    output_filename = f"{safe_table_name}.json"
                    output_path = os.path.join(
                        area_folder_path, output_filename)
                    table_df.to_json(output_path, orient='records', indent=2)
                    print(f"Saved results to {output_path}")
            print(
                f"\nSuccessfully obtained data from {len(all_trip_results)} trip tables.")
        else:
            print("No trip tables found to process queries.")

    def _run_for_network_segments(self, gdf: geopandas.GeoDataFrame, area_name: str, schema_df: pandas.DataFrame) -> pandas.DataFrame:
        result_dfs: pandas.DataFrame = []
        segments_df = pandas.DataFrame()
        # Loop through network segments tables and run queries
        # Filter schema_df to only inclue the tables where the table_name column ends with 'segments'
        schema_df = schema_df[schema_df['table_name'].str.endswith('segments')]

        if schema_df is not None and not schema_df.empty:
            for table_name in schema_df['table_name']:
                # Set full_table_path be equal to the table_name column in the schema_df
                full_table_path = f"{self.project_id}.{self.region}.{table_name}"

            for _, row in gdf.iterrows():
                # this is a tuple for each row
                rows_str = str((row['name'], row['geometry_wkt']))

                # Run query to get netowrk segments tables
                segments_query = f'''
                CREATE TEMP TABLE geo_table (
                    name STRING,
                    geometry_wkt STRING
                );
                INSERT geo_table(name, geometry_wkt) VALUES {rows_str};
                CREATE TEMP TABLE query_geo AS
                SELECT
                    name,
                    SAFE.ST_GEOGFROMTEXT(geometry_wkt) AS geometry 
                FROM geo_table;
                
                SELECT *
                FROM {full_table_path}
                WHERE
                EXISTS (
                    SELECT 1
                    FROM query_geo
                    WHERE ST_COVERS(query_geo.geometry, ST_GEOGPOINT(startLon, startLat))   
                )
                OR
                EXISTS (
                    SELECT 1
                    FROM query_geo
                    WHERE ST_COVERS(query_geo.geometry, ST_GEOGPOINT(endLon, endLat))
                )
                '''
                segments_df = pandas_gbq.read_gbq(
                    segments_query, project_id=self.project_id, dialect='standard')
                result_dfs.append(segments_df)
                # Build output path with both area_name and table_name
                safe_table_name = table_name.replace('.', '_')
                output_filename = f"{area_name}_{safe_table_name}.json"
                segment_folder_path = os.path.join(
                    self.folder_path, area_name, "network_segments")
                os.makedirs(segment_folder_path, exist_ok=True)
                output_path = os.path.join(
                    segment_folder_path, output_filename)
                segments_df.to_json(output_path, orient='records', indent=2)
                print(f"Saved results to {output_path}")
            print(
                f"\nSuccessfully obtained data from {len(result_dfs)} network segments tables.")
        else:
            print("No network segments tables found to process queries.")

    def _run_for_pop_(self, gdf: geopandas.GeoDataFrame, area_name: str, schema_df: pandas.DataFrame) -> pandas.DataFrame:
        result_dfs: pandas.DataFrame = []
        population_df = pandas.DataFrame()
        # Loop through network segments tables and run queries
        # Filter schema_df to only inclue the tables where the table_name column ends with 'population'
        schema_df = schema_df[schema_df['table_name'].str.endswith(
            'population')]

        if schema_df is not None and not schema_df.empty:
            for table_name in schema_df['table_name']:
                # Set full_table_path be equal to the table_name column in the schema_df
                full_table_path = f"{self.project_id}.{self.region}.{table_name}"

            for _, row in gdf.iterrows():
                # this is a tuple for each row
                rows_str = str((row['name'], row['geometry_wkt']))

                # Run query to get netowrk segments tables
                pop_query = f'''
                CREATE TEMP TABLE geo_table (
                    name STRING,
                    geometry_wkt STRING
                );
                INSERT geo_table(name, geometry_wkt) VALUES {rows_str};
                CREATE TEMP TABLE query_geo AS
                SELECT
                    name,
                    SAFE.ST_GEOGFROMTEXT(geometry_wkt) AS geometry 
                FROM geo_table;
                
                SELECT *
                FROM {full_table_path}
                WHERE
                EXISTS (
                    SELECT 1
                    FROM query_geo
                    WHERE ST_COVERS(query_geo.geometry, ST_GEOGPOINT(lng, lat))   
                )
                '''
                population_df = pandas_gbq.read_gbq(
                    pop_query, project_id=self.project_id, dialect='standard')
                result_dfs.append(population_df)
                # Build output path with both area_name and table_name
                safe_table_name = table_name.replace('.', '_')
                output_filename = f"{area_name}_{safe_table_name}.json"
                pop_folder_path = os.path.join(
                    self.folder_path, area_name, "population")
                os.makedirs(pop_folder_path, exist_ok=True)
                output_path = os.path.join(pop_folder_path, output_filename)
                population_df.to_json(output_path, orient='records', indent=2)
                print(f"Saved results to {output_path}")
            print(
                f"\nSuccessfully obtained data from {len(result_dfs)} network segments tables.")
        else:
            print("No network segments tables found to process queries.")

    def _build_query(self, rows_str: str, full_table_path: str, origin_lng_col: str, origin_lat_col: str,
                     dest_lng_col: str, dest_lat_col: str) -> str:
        '''
        Builds the query to get data from the replica dataset.        
        '''
        return f'''
        CREATE TEMP TABLE geo_table (
            name STRING,
            geometry_wkt STRING
        );
        INSERT geo_table(name, geometry_wkt) VALUES {rows_str};
        CREATE TEMP TABLE query_geo AS
        SELECT
            name,
            SAFE.ST_GEOGFROMTEXT(geometry_wkt) AS geometry 
        FROM geo_table;
        SELECT {self.columns_to_select}, {origin_lng_col}, {origin_lat_col}, {dest_lng_col}, {dest_lat_col}
        FROM {full_table_path}
        WHERE
        EXISTS (
            SELECT 1
            FROM query_geo
            WHERE ST_COVERS(query_geo.geometry, ST_GEOGPOINT({origin_lng_col}, {origin_lat_col}))   
        )
        OR
        EXISTS (
            SELECT 1
            FROM query_geo
            WHERE ST_COVERS(query_geo.geometry, ST_GEOGPOINT({dest_lng_col}, {dest_lat_col}))
        )
        '''

    def _run_with_queue(self, gdf_upload: geopandas.GeoDataFrame, full_table_path: str, origin_lng_col: str,
                        origin_lat_col: str, dest_lng_col: str, dest_lat_col: str, max_query_chars: int = 1000000) -> pandas.DataFrame:
        result_dfs: pandas.DataFrame = []
        queue: list[str] = []
        queue_length = 0
        print(f'Processing chunks for table {full_table_path}...')
        for _, row in gdf_upload.iterrows():
            # this is a tuple for each row
            rows_str = str((row['name'], row['geometry_wkt']))

            queue_is_full = queue_length + len(rows_str) > max_query_chars

            # if the queue is not full, add the row to the queue and continue to the next row
            if (not queue_is_full):
                queue.append(rows_str)
                queue_length += len(rows_str)
                continue

            # otherwise, run the query for the current chunk/queue
            # before queueing the current row
            rows_str = ', '.join(queue)
            query = self._build_query(rows_str, full_table_path, origin_lng_col,
                                      origin_lat_col, dest_lng_col, dest_lat_col)
            df = pandas_gbq.read_gbq(
                query, project_id=self.project_id, dialect='standard')
            result_dfs.append(df)
            # create a new queue with the current row
            queue = [rows_str]
            queue_length = len(rows_str)
        # if there is anything left in the queue, run the query for the last chunk
        if queue:
            rows_str = ', '.join(queue)
            query = self._build_query(rows_str, full_table_path, origin_lng_col, origin_lat_col,
                                      dest_lng_col, dest_lat_col)
            df = pandas_gbq.read_gbq(
                query, project_id=self.project_id, dialect='standard')
            result_dfs.append(df)
        # Merge all results
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
            REGEXP_EXTRACT(table_name, r'_([Qq]\d)_') AS quarter,
            -- Extract the dataset (the part after the season)
            REGEXP_EXTRACT(table_name, r'_[Qq]\d_(.*)') AS dataset
        FROM
        `replica-customer.south_atlantic.INFORMATION_SCHEMA.TABLES`;
        '''
        return pandas_gbq.read_gbq(query, project_id=self.project_id, dialect='standard')
