import os
import shutil
from typing import Literal, Optional

import geopandas
import pandas
import requests
from shapely import LineString

from etl.downloader import Downloader

type Quarter = Literal['Q2', 'Q4']
type Season = tuple[int, Quarter]


class GreentlinkGtfsETL:
    gtfs_download_url = 'https://gtfs.greenlink.cadavl.com/GTA/GTFS/GTFS_GTA.zip'
    folder_path = './data/greenlink_gtfs'

    seasons: list[Season]

    transitland_feed_list_url = 'https://transit.land/api/v2/rest/feed_versions?feed_onestop_id=f-dnjq-greenlink&fetched_after={iso8601_start}&fetched_before={iso8601_end}'
    transitland_feed_download_url = 'https://transit.land/api/v2/rest/feed_versions/{feed_version_key}/download'

    # a list that contains seasons that could not be downloaded
    # so the next available season can be used instead
    pending_substitutions: list[Season] = []

    def __init__(self, seasons: Optional[list[Season]] = None):
        """
        Initialize the GreentlinkGtfsETL with the seasons to process.

        Args:
            seasons (Optional[tuple[int, str]]): A tuple containing the year and season to process.
                If None, all seasons will be processed. The season is a tuple of (year, quarter),
                where quarter is a string that is either 'Q2' or 'Q4'.
        """
        if seasons is None:
            # form a tuple of seasons starting at fall 2019 until the current year
            current_year = pandas.Timestamp.now().year
            years = list(range(2019, current_year + 1))
            quarters: list[Quarter] = ['Q2', 'Q4']

            seasons = []
            for year in years:
                is_current_year = year == current_year
                for quarter in quarters:
                    # skip Q4 of the current year
                    if not (is_current_year and quarter == 'Q4'):
                        seasons.append((year, quarter))
        else:
            # validate seasons
            for year, quarter in seasons:
                if not isinstance(year, int) or not (quarter in ['Q2', 'Q4']):
                    raise ValueError(
                        "Invalid season format. Expected (year: int, quarter: 'Q2' or 'Q4'). Got: ({}, {}).".format(year, quarter))

        self.seasons = seasons

        # create folder if it does not exist
        os.makedirs(self.folder_path, exist_ok=True)

    def run(self, transitland_api_key: Optional[str] = None) -> None:
        last_already_existed = False
        for season in self.seasons:
            year, quarter = season
            folder_path = f'{self.folder_path}/{year}/{quarter}'

            # only download if the folder does not already exist
            if os.path.exists(folder_path):
                if not last_already_existed:
                    print('')
                print(
                    f"GTFS data for {year} {quarter} already exists. Skipping download.")
                last_already_existed = True
                continue

            print(f"\nDownloading GTFS data for {year} {quarter}...")
            last_already_existed = False
            should_continue_parsing = self.download(
                season, transitland_api_key)
            if not should_continue_parsing:
                # if the download failed, skip to the next season
                continue

            # convert the GTFS data
            self.to_csv(season)
            self.convert_to_geojson(season)

            # if there are any pending substitutions, copy the result for this
            # season to the pending seasons
            if self.pending_substitutions:
                for pending_season in self.pending_substitutions:
                    pending_year, pending_quarter = pending_season
                    pending_folder_parent_path = f'{self.folder_path}/{pending_year}'
                    if not os.path.exists(pending_folder_parent_path):
                        os.makedirs(pending_folder_parent_path, exist_ok=True)
                    # copy the current season's folder to the pending season's folder
                    pending_folder_path = f'{pending_folder_parent_path}/{pending_quarter}'
                    shutil.copytree(folder_path, pending_folder_path)
                # clear the pending substitutions list
                self.pending_substitutions.clear()

    def download(self, season: Season, transitland_api_key: Optional[str] = None) -> bool:
        year, quarter = season
        folder_path = f'{self.folder_path}/{year}/{quarter}'

        # if the transitland_api_key is provided, download the GTFS data from Transitland
        if transitland_api_key:
            headers = {
                'api_key': transitland_api_key
            }

            # create the time range for the season
            if quarter == 'Q2':
                start_timestamp = f'{year}-01-01T00:00:00Z'
                end_timestamp = f'{year}-05-31T23:59:59Z'
            else:
                start_timestamp = f'{year}-07-01T00:00:00Z'
                end_timestamp = f'{year}-12-31T23:59:59Z'

            # find the latest feed version for the season
            transitland_feed_list_url = self.transitland_feed_list_url.format(
                iso8601_start=start_timestamp,
                iso8601_end=end_timestamp
            )
            response = requests.get(
                transitland_feed_list_url, headers=headers, verify=True)
            response.raise_for_status()  # raise an error for bad responses
            feed_versions = response.json()['feed_versions']
            latest_feed_version = feed_versions[0] if feed_versions else None
            latest_feed_version_key = latest_feed_version['sha1'] if latest_feed_version else None

            # download the latest feed version
            transitland_feed_download_url = self.transitland_feed_download_url.format(
                feed_version_key=latest_feed_version_key
            )
            try:
                Downloader(
                    transitland_feed_download_url,
                    folder_path
                )\
                    .download(headers=headers, raise_on_request_error=True)\
                    .unzip()
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    print(
                        f"No GTFS data found for {year} {quarter} in Transitland. The next available season downloaded during this run will be used instead.")
                    self.pending_substitutions.append(season)
                    return False
            return True

        # otherwise, download from the live GTFS feed
        Downloader(
            self.gtfs_download_url,
            folder_path
        )\
            .download()\
            .unzip()
        return True

    def to_csv(self, season: Season) -> None:
        """
        Convert the GTFS data to CSV format. The GTFC data are comma separated values inside of txt files.
        """
        year, quarter = season
        folder_path = f'{self.folder_path}/{year}/{quarter}'

        # rename all .txt files in the directory to .csv
        for filename in os.listdir(folder_path):
            if filename.endswith('.txt'):
                old_file_name = folder_path + '/' + filename
                new_file_name = old_file_name.replace('.txt', '.csv')
                os.rename(old_file_name, new_file_name)
                print(f"Renamed {old_file_name} to {new_file_name}")

    def convert_to_geojson(self, season: Season) -> None:
        """
        Convert the GTFS data to GeoJSON format.
        """
        year, quarter = season
        folder_path = f'{self.folder_path}/{year}/{quarter}'

        # convert stops to geodataframe
        stops_csv_file = folder_path + '/stops.csv'
        convert_stops(stops_csv_file)
        os.remove(stops_csv_file)
        print(f"Converted stops to GeoJSON format.")

        # convert shapes to geodataframe
        shapes_csv_file = folder_path + '/shapes.csv'
        shapes_geojson_file = convert_shapes(shapes_csv_file)
        os.remove(shapes_csv_file)
        print(f"Converted shapes to GeoJSON format.")

        # convert routes to geodataframe
        routes_csv_file = folder_path + '/routes.csv'
        trips_csv_file = folder_path + '/trips.csv'
        convert_routes(trips_csv_file, routes_csv_file, shapes_geojson_file)
        os.remove(routes_csv_file)
        os.remove(trips_csv_file)
        print(f"Converted trips and routes to GeoJSON format.")

        # remove unused csv
        to_keep = ['stop_times.csv']
        for filename in os.listdir(folder_path):
            if filename.endswith('.csv') and filename not in to_keep:
                os.remove(os.path.join(folder_path, filename))


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
        inplace=True,
        errors='ignore',  # ignore errors if columns are not present
    )

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
    linestrings = shapes_df.sort_values(['shape_id', 'shape_pt_sequence'], ascending=True).groupby('shape_id').agg(
        geometry=('shape_pt_lon', lambda x: LineString(
            shapes_df.loc[x.index][['shape_pt_lon', 'shape_pt_lat']].values))
    ).reset_index()

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
    shapes_with_route_ids_gdf['route_id'] = shapes_with_route_ids_gdf['route_id'].astype(
        str)
    routes_df['route_id'] = routes_df['route_id'].astype(str)
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
