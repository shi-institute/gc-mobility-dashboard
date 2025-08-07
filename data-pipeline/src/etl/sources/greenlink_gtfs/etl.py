import os
import shutil
from pathlib import Path
from typing import Literal, Optional

import geopandas
import pandas
import requests
from shapely import LineString

from etl.downloader import Downloader
from etl.geodesic import (geodesic_area_series, geodesic_buffer_series,
                          geodesic_length_series)

type Quarter = Literal['Q2', 'Q4']
type Season = tuple[int, Quarter]

mile_meters = 1609.344  # 1 mile in meters
bike_speed = 15  # average bike speed in mph
# distance in meters that can be covered in 15 minutes at average bike speed
bike_travel_distance_meters = mile_meters * (bike_speed / 60) * 15


class GreenlinkGtfsETL:
    gtfs_download_url = 'https://gtfs.greenlink.cadavl.com/GTA/GTFS/GTFS_GTA.zip'
    folder_path = './data/greenlink_gtfs'
    service_area_overrides_folder = 'input/greenlink_gtfs/service_area_overrides'

    seasons: list[Season]
    areas: list[tuple[Path, str]]  # list of tuples (geojson_path, area_name)

    transitland_feed_list_url = 'https://transit.land/api/v2/rest/feed_versions?feed_onestop_id=f-dnjq-greenlink&fetched_after={iso8601_start}&fetched_before={iso8601_end}'
    transitland_feed_download_url = 'https://transit.land/api/v2/rest/feed_versions/{feed_version_key}/download'

    # a list that contains seasons that could not be downloaded
    # so the next available season can be used instead
    pending_substitutions: list[Season] = []

    def __init__(self, seasons: Optional[list[Season]] = None, area_geojson_paths: Optional[list[str] | list[Path]] = None):
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

        area_geojson_paths = [Path(path) for path in (area_geojson_paths or [])]
        area_names = [os.path.splitext(path.name)[0] for path in area_geojson_paths]
        self.areas = list(zip(area_geojson_paths, area_names))

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

        # generate service areas
        print("\nGenerating service areas...")
        for season in self.seasons:
            self.generate_service_areas(season)

        # calculate service distance and coverage stats
        print("\nCalculating service coverage stats...")
        service_coverage_stats = []
        for season in self.seasons:
            stats = self.calculate_service_coverage(season)
            service_coverage_stats += stats

        # save the service coverage stats to a json file
        stats_file_path = f'{self.folder_path}/service_coverage_stats.json'
        pandas.DataFrame(service_coverage_stats)\
            .to_json(stats_file_path, orient='records')

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

    def generate_service_areas(self, season: Season) -> None:
        """Generates sevice areas (buffers) for the stops in the GTFS data.

        This process generates geodesic buffers for bus stops instead of euclidean buffers.
        The geodesic buffers are based on the WGS84 ellipsoid.

        For the paratransit buffer, a euclidian buffer is used instead. The transit routes
        are temporariliy reprojected to EPSG:6569 (NAD83 (2011) / South Carolina (meters))
        before the buffer is applied.

        An indiividual season's walk-time and bike-time service area can be overriden
        by providing a geojson in the `input/greenlink_gtfs/service_area_overrides` folder.
        Name walksheds as `walkshed_{year}_{quarter}.geojson` and bikesheds as
        `bikeshed_{year}_{quarter}.geojson`.

        Args:
            season (Season): A tuple containing the year and quarter of the season to process.
        """

        year, quarter = season
        output_folder_path = f'{self.folder_path}/{year}/{quarter}'
        stops_geojson_file_path = f'{output_folder_path}/stops.geojson'
        routes_geojson_file_path = f'{output_folder_path}/routes.geojson'

        walkshed_override_file_path = f'{self.service_area_overrides_folder}/walkshed_{year}_{quarter}.geojson'
        output_file_path = f'{output_folder_path}/walk_service_area.geojson'

        # copy the walkshed override file to the output folder if it is provided
        if os.path.exists(walkshed_override_file_path):
            shutil.copy(walkshed_override_file_path, output_file_path)
            print(f"Using walkshed override for {year} {quarter}.")

        # otherwise, generate a walk-time service area
        else:
            walk_gdf = geopandas.read_file(stops_geojson_file_path).to_crs('EPSG:4326')
            walk_gdf.geometry = geodesic_buffer_series(walk_gdf.geometry, mile_meters / 2)
            walk_gdf = walk_gdf.dissolve()
            walk_gdf.to_file(output_file_path, driver='GeoJSON')
            print(f"Generated walk-time service area for {year} {quarter}.")

        bikeshed_override_file_path = f'{self.service_area_overrides_folder}/bikeshed_{year}_{quarter}.geojson'
        output_file_path = f'{output_folder_path}/bike_service_area.geojson'

        # copy the bikeshed override file to the output folder if it is provided
        if os.path.exists(bikeshed_override_file_path):
            shutil.copy(bikeshed_override_file_path, output_file_path)
            print(f"Using bikeshed override for {year} {quarter}.")

        # otherwise, generate a bike-time service area
        else:
            bike_gdf = geopandas.read_file(stops_geojson_file_path).to_crs('EPSG:4326')
            bike_gdf.geometry = geodesic_buffer_series(
                bike_gdf.geometry, bike_travel_distance_meters)
            bike_gdf = bike_gdf.dissolve()
            bike_gdf.to_file(output_file_path, driver='GeoJSON')
            print(f"Generated bike-time service area for {year} {quarter}.")

        # generate the paratransit service area
        output_file_path = f'{output_folder_path}/paratransit_service_area.geojson'
        paratransit_gdf = geopandas.read_file(routes_geojson_file_path).to_crs('EPSG:6569')
        paratransit_gdf.geometry = paratransit_gdf.geometry.buffer(
            distance=mile_meters * 0.75, cap_style='round')
        paratransit_gdf = paratransit_gdf.dissolve()
        paratransit_gdf = paratransit_gdf.to_crs('EPSG:4326')
        paratransit_gdf.to_file(output_file_path, driver='GeoJSON')
        print(f"Generated paratransit service area for {year} {quarter}.")

    def calculate_service_coverage(self, season: Season) -> list[dict[str, int | float]]:
        year, quarter = season
        output_folder_path = f'{self.folder_path}/{year}/{quarter}'

        # read the GeoJSON files
        print(f'Opening GeoJSON files for {year} {quarter}...')
        routes_file_path = os.path.join(output_folder_path, 'routes.geojson')
        routes_gdf = geopandas.read_file(routes_file_path)

        walk_service_area_file_path = os.path.join(output_folder_path, 'walk_service_area.geojson')
        walk_service_area_gdf = geopandas.read_file(walk_service_area_file_path)

        bike_service_area_file_path = os.path.join(output_folder_path, 'bike_service_area.geojson')
        bike_service_area_gdf = geopandas.read_file(bike_service_area_file_path)

        paratransit_service_area_file_path = os.path.join(
            output_folder_path, 'paratransit_service_area.geojson')
        paratransit_service_area_gdf = geopandas.read_file(paratransit_service_area_file_path)

        all_geo_stats: list[dict[str, int | float]] = []

        print(f'Calculating service coverage for {year} {quarter}...')

        # calculate the distance of the routes in meters
        distance_meters = geodesic_length_series(routes_gdf.geometry)

        # calculate the service coverage for each service area
        walk_perimeter, walk_area = geodesic_area_series(walk_service_area_gdf.geometry)
        bike_perimeter, bike_area = geodesic_area_series(bike_service_area_gdf.geometry)
        para_perimeter, para_area = geodesic_area_series(paratransit_service_area_gdf.geometry)

        total_geo_stats = {
            'year': year,
            'quarter': quarter,
            'routes_distance_meters': distance_meters,
            'walk_service_area_perimeter_meters': walk_perimeter,
            'walk_service_area_area_square_meters': walk_area,
            'bike_service_area_perimeter_meters': bike_perimeter,
            'bike_service_area_area_square_meters': bike_area,
            'paratransit_service_area_perimeter_meters': para_perimeter,
            'paratransit_service_area_area_square_meters': para_area
        }
        all_geo_stats.append(total_geo_stats)

        # also calculate the service area stats for each area
        for area_geojson_path, area_name in self.areas:
            print(f'Calculating service coverage for area {area_name} for {year} {quarter}...')

            area_gdf = geopandas.read_file(area_geojson_path)
            area_routes = geopandas.overlay(
                routes_gdf, area_gdf, how='intersection')
            area_walk_service_area = geopandas.overlay(
                walk_service_area_gdf, area_gdf, how='intersection')
            area_bike_service_area = geopandas.overlay(
                bike_service_area_gdf, area_gdf, how='intersection')
            area_paratransit_service_area = geopandas.overlay(
                paratransit_service_area_gdf, area_gdf, how='intersection')

            # calculate the service area stats for the area
            area_routes_distance_meters = geodesic_length_series(area_routes.geometry)
            area_walk_perimeter, area_walk_area = geodesic_area_series(
                area_walk_service_area.geometry)
            area_bike_perimeter, area_bike_area = geodesic_area_series(
                area_bike_service_area.geometry)
            area_para_perimeter, area_para_area = geodesic_area_series(
                area_paratransit_service_area.geometry)

            # share the stats for the area
            geo_stats = {
                'year': year,
                'quarter': quarter,
                'area': area_name,
                'routes_distance_meters': area_routes_distance_meters,
                'walk_service_area_perimeter_meters': area_walk_perimeter,
                'walk_service_area_area_square_meters': area_walk_area,
                'bike_service_area_perimeter_meters': area_bike_perimeter,
                'bike_service_area_area_square_meters': area_bike_area,
                'paratransit_service_area_perimeter_meters': area_para_perimeter,
                'paratransit_service_area_area_square_meters': area_para_area
            }
            all_geo_stats.append(geo_stats)

        # share the stats
        return all_geo_stats


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

    # Shapes are represented as a sequence of points.
    # We can follow the sequence for each shape_id to
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
