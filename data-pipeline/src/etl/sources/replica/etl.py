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
            
            # get the data from replica's bigquery
            output_df = self._run_with_queue(gdf)
            
            # export to json
            output_path = os.path.join(self.folder_path, f'{area_name}.json')
            output_df.to_json(output_path, orient='records', indent=2)
            
    def _build_query(self, rows_str: str) -> str:
        '''
        Builds the a query to get data from the replica dataset.        
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
        FROM {self.season_dataset}
        JOIN query_geo AS o
            ON ST_COVERS(o.geometry, ST_GEOGPOINT(origin_bgrp_lng, origin_bgrp_lat))
        JOIN query_geo AS d
            ON ST_COVERS(d.geometry, ST_GEOGPOINT(destination_bgrp_lng, destination_bgrp_lat))
        '''
        
    def _run_with_queue(self, gdf_upload: geopandas.GeoDataFrame, max_query_chars=1000000) -> pandas.DataFrame:
        result_dfs: pandas.DataFrame = []
        queue: list[str] = []
        queue_length = 0

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
            query = self._build_query(rows_str)
            df = pandas_gbq.read_gbq(query, project_id=self.project_id, dialect='standard')
            result_dfs.append(df)

            # create a new queue with the current row
            queue = [row_str]
            queue_length = len(row_str)


        # if there is anything left in the queue, run the query for the last chunk
        if queue:
            rows_str = ', '.join(queue)
            query = self._build_query(rows_str)
            df = pandas_gbq.read_gbq(query, project_id=self.project_id, dialect='standard')
            result_dfs.append(df)

        # Merge all results
        return pandas.concat(result_dfs, ignore_index=True)
