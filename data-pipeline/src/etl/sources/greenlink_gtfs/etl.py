import os
import shutil

import geopandas
import pandas
from etl.downloader import Downloader
from shapely import LineString


class GreentlinkGtfsETL:
    gtfs_download_url = 'https://gtfs.greenlink.cadavl.com/GTA/GTFS/GTFS_GTA.zip'
    folder_path = '../frontend/public/data/greenlink_gtfs'

    def run(self):
        self.download()
        self.to_csv()
        self.convert_to_geojson()

    def download(self):
        Downloader(
            self.gtfs_download_url,
            self.folder_path
        )\
            .download()\
            .unzip()

    def to_csv(self):
        """
        Convert the GTFS data to CSV format. The GTFC data are comma separated values inside of txt files.
        """
        # rename all .txt files in the directory to .csv
        for filename in os.listdir(self.folder_path):
            if filename.endswith('.txt'):
                old_file_name = self.folder_path + '/' + filename
                new_file_name = old_file_name.replace('.txt', '.csv')
                os.rename(old_file_name, new_file_name)
                print(f"Renamed {old_file_name} to {new_file_name}")

    def convert_to_geojson(self):
        """
        Convert the GTFS data to GeoJSON format.
        """

        # convert stops to geodataframe
        stops_csv_file = self.folder_path + '/stops.csv'
        convert_stops(stops_csv_file)
        os.remove(stops_csv_file)
        print(f"Converted stops to GeoJSON format.")

        # convert shapes to geodataframe
        shapes_csv_file = self.folder_path + '/shapes.csv'
        shapes_geojson_file = convert_shapes(shapes_csv_file)
        os.remove(shapes_csv_file)
        print(f"Converted shapes to GeoJSON format.")

        # convert routes to geodataframe
        routes_csv_file = self.folder_path + '/routes.csv'
        trips_csv_file = self.folder_path + '/trips.csv'
        convert_routes(trips_csv_file, routes_csv_file, shapes_geojson_file)
        os.remove(routes_csv_file)
        os.remove(trips_csv_file)
        print(f"Converted trips and routes to GeoJSON format.")

        # remove used csv
        os.remove(self.folder_path + '/agency.csv')
        os.remove(self.folder_path + '/calendar.csv')
        os.remove(self.folder_path + '/calendar_dates.csv')
        os.remove(self.folder_path + '/transfers.csv')


def convert_stops(stops_csv_file: str) -> str:
    # convert stops to geodataframe
    stops_df = pandas.read_csv(stops_csv_file)
    stops_gdf = geopandas.GeoDataFrame(
        stops_df,
        geometry=geopandas.points_from_xy(
            stops_df.stop_lon, stops_df.stop_lat
        ),
        crs='EPSG:4326'
    )

    # drop and rename columns
    stops_gdf.drop(
        columns=['stop_id', 'zone_id', 'location_type', 'stop_desc',
                 'parent_station', 'vehicle_type', 'stop_lat', 'stop_lon'],
        inplace=True)

    stops_gdf.rename(
        columns={
            'stop_name': 'Name',
            'stop_code': 'ID',
        },
        inplace=True
    )

    # Each stop appears twice, but we only need it once.
    # Greelinks's GTFS omits the stop_code for the duplicates.
    stops_gdf = stops_gdf[stops_gdf['ID'].notna()]

    # convert data types
    stops_gdf['ID'] = stops_gdf['ID'].astype(int)

    # save to GeoJSON
    output_path = stops_csv_file.replace('.csv', '.geojson')
    json = stops_gdf.to_json(separators=(',', ':'))
    with open(output_path, 'w') as file:
        file.write(json)
    return output_path


def convert_shapes(shapes_csv_file: str) -> str:
    # read shapes to datframe
    shapes_df = pandas.read_csv(shapes_csv_file)

    # Shapes are represented as a sequency of points.
    # We can follow the sequency for each shape_id to
    # create a LINESTRING for each shape_id.
    linestrings = shapes_df.sort_values(['shape_id', 'shape_pt_sequence'], ascending=True).groupby('shape_id').apply(
        # create LineString from ordered lon/lat points
        lambda x: LineString(x[['shape_pt_lon', 'shape_pt_lat']].values)
    ).reset_index(name='geometry')

    # convert to geodataframe
    shapes_gdf = geopandas.GeoDataFrame(linestrings, crs='EPSG:4326')

    # save to GeoJSON
    output_path = shapes_csv_file.replace('.csv', '.geojson')
    json = shapes_gdf.to_json(separators=(',', ':'))
    with open(output_path, 'w') as file:
        file.write(json)
    return output_path


def convert_routes(trips_csv_file: str, routes_csv_file: str, shapes_geojson_file: str) -> str:
    # read to data frames
    trips_df = pandas.read_csv(trips_csv_file)
    routes_df = pandas.read_csv(routes_csv_file)
    shapes_gdf = geopandas.read_file(shapes_geojson_file)

    # associate a route_id with each shape_id
    shapes_with_route_ids_gdf = shapes_gdf.merge(
        trips_df[['route_id', 'shape_id']].drop_duplicates(), on='shape_id', how='left')
    shapes_with_route_ids_gdf = shapes_with_route_ids_gdf.drop(columns=[
                                                               'id']).dropna()
    shapes_with_route_ids_gdf['route_id'] = shapes_with_route_ids_gdf['route_id'].astype(
        str).apply(lambda x: x.split('.')[0])

    # join route details to shapes
    routes_gdf = shapes_with_route_ids_gdf.merge(
        routes_df, on='route_id', how='left')

    # drop and rename columns
    routes_gdf = routes_gdf.drop(
        columns=['agency_id', 'route_desc', 'route_short_name', 'route_type'])
    routes_gdf = routes_gdf.rename(columns={'route_long_name': 'Name', 'route_id': 'ID',
                                   'route_color': 'Color', 'route_text_color': 'TextColor', 'shape_id': 'ShapeID'})

    # save to GeoJSON
    output_path = routes_csv_file.replace('.csv', '.geojson')
    json = routes_gdf.to_json(separators=(',', ':'))
    with open(output_path, 'w') as file:
        file.write(json)
    return output_path
