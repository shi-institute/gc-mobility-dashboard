from typing import Self
import os
import geopandas
from tqdm import tqdm 
import pandas
import pandas_gbq
import shapely

import logging
logger = logging.getLogger('pandas_gbq')
logger.setLevel(logging.DEBUG)
logger.addHandler(logging.StreamHandler())

class ReplicaETL:
    project_id = 'replica-customer'
    region = 'south_atlantic'
    input_folder_path = '../input/replica_interest_area_polygons'
    folder_path = '../data/replica'
    season_dataset: str
    columns_to_select = 'o.name AS origin_geo, d.name AS destination_geo'
    
    
    def __init__(self, dataset: str, columns: list[str]) -> None:
        """
        Initializes the replica ETL with a sepecific dataset and columns from that
        dataset.
        """ 
        self.season_dataset = f'{self.project_id}.{self.region}.{dataset}'
        
        # append the columns to the existing columns_to_select
        if len(columns) > 0:
            self.columns_to_select += ', '
            self.columns_to_select += ','.join(columns) 
        
        # ensure the output folder exists
        if not os.path.exists(self.folder_path):
            os.makedirs(self.folder_path)
        
    def run(self):
        # get all geojson files from the input folder
        input_filenames = os.listdir(self.input_folder_path)
        geojson_filename = [filename for filename in input_filenames if filename.endswith('.geojson')]
        
        # get the schema for the replica dataset
        schema_df = pandas_gbq.read_gbq(self.schema_query(), project_id=self.project_id, dialect='standard')
        #Filter schema_df to only inclue the tables where the table_name column ends with 'trip'
        schema_df = schema_df[schema_df['table_name'].str.endswith('trip')]
        print(schema_df.head())
        
        # process each geojson file
        for filename in geojson_filename:
            print(f'Processing {filename}...')
            # extract the area name from the filename
            area_name = os.path.splitext(filename)[0]
            
            # open the geojson file
            gdf = geopandas.read_file(os.path.join(self.input_folder_path, filename)).to_crs(epsg=4326)
            
            # set the name column to the area name
            # and discard all other columns
            gdf['name'] = area_name
            gdf = gdf[['name', 'geometry']].copy()
            
            # get the geometry in wkt format
            gdf['geometry_wkt'] = gdf['geometry'].apply(lambda x: shapely.wkt.dumps(x))
            
            # # get the data from replica's bigquery
            # output_df = self._run_with_queue(gdf)
            #Loop through trip tables and run queries
            all_trip_results = []
            table_df = pandas.DataFrame()
        
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
                        #Add a column to identify the source table
                        table_df['source_table'] = table_name
                        all_trip_results.append(table_df)
                        # Build output path with both area_name and table_name
                        safe_table_name = table_name.replace('.', '_')  # for filename safety
                        output_filename = f"{area_name}_{safe_table_name}.json"
                        output_path = os.path.join(self.folder_path, output_filename)
                        
                        table_df.to_json(output_path, orient='records', indent=2)
                        print(f"Saved results to {output_path}")

                print(f"\nSuccessfully obtained data from {len(all_trip_results)} trip tables.")

            else:
                print("No trip tables found to process queries.")
            


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

        SELECT {self.columns_to_select}
        FROM {full_table_path}
        JOIN query_geo AS o
            ON ST_COVERS(o.geometry, ST_GEOGPOINT({origin_lng_col}, {origin_lat_col}))
        JOIN query_geo AS d
            ON ST_COVERS(d.geometry, ST_GEOGPOINT({dest_lng_col}, {dest_lat_col}))
        '''
        
    def _run_with_queue(self, gdf_upload: geopandas.GeoDataFrame, full_table_path: str,origin_lng_col:str, 
                        origin_lat_col: str,dest_lng_col:str, dest_lat_col:str, max_query_chars: int = 1000000) -> pandas.DataFrame:
        result_dfs: pandas.DataFrame = []
        queue: list[str] = []
        queue_length = 0
        print(f'Processing chunks for table {full_table_path}...')

        for _, row in gdf_upload.iterrows():
            row_str = str((row['name'], row['geometry_wkt'])) # this is a tuple for each row
            
            queue_is_full = queue_length + len(row_str) > max_query_chars
            
            # if the queue is not full, add the row to the queue and continue to the next row
            if (not queue_is_full):
                queue.append(row_str)
                queue_length += len(row_str)
                continue;
            
            # otherwise, run the query for the current chunk/queue
            # before queueing the current row
            rows_str = ', '.join(queue)
            query = self._build_query(rows_str, full_table_path, origin_lng_col, origin_lat_col, dest_lng_col, dest_lat_col)
            df = pandas_gbq.read_gbq(query, project_id=self.project_id, dialect='standard')
            result_dfs.append(df)

            # create a new queue with the current row
            queue = [row_str]
            queue_length = len(row_str)


        # if there is anything left in the queue, run the query for the last chunk
        if queue:
            rows_str = ', '.join(queue)
            query = self._build_query(rows_str, full_table_path)
            df = pandas_gbq.read_gbq(query, project_id=self.project_id, dialect='standard')
            result_dfs.append(df)

        # Merge all results
        return pandas.concat(result_dfs, ignore_index=True)
    
    def schema_query(self) -> str:
        """
        Returns the schema for the replica dataset.
        """
        return f'''
        SELECT
            table_name,
            -- Extract 'south_atlantic' from the table name
            'south_atlantic' AS region,
            -- Extract the year (four digits after 'south_atlantic_')
            REGEXP_EXTRACT(table_name, r'south_atlantic_(\d{4})_') AS year,
            -- Extract the season (Q and a digit)
            REGEXP_EXTRACT(table_name, r'_([Qq]\d)_') AS season,
            -- Extract the dataset (the part after the season)
            REGEXP_EXTRACT(table_name, r'_[Qq]\d_(.*)') AS dataset
        FROM
        `replica-customer.south_atlantic.INFORMATION_SCHEMA.TABLES`;
        ''' 
