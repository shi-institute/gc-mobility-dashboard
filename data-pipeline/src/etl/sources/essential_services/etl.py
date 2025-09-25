import json
import logging
import os
import shutil
from pathlib import Path
from typing import Any, Generator, Iterator, Literal, Self

import geopandas
import pandas
import pyogrio
from pyproj import CRS

from etl.geodesic import geodesic_buffer_series

logger = logging.getLogger('essential_services_etl')
logger.setLevel(logging.DEBUG)


class EssentialServicesETL:
    replica_folder = Path('data/replica')
    geocoder_output_folder = Path('data/geocoded')
    greenlink_gtfs_folder = Path('data/greenlink_gtfs')
    output_folder = Path('data/essential_services')
    include_full_area_in_areas = os.getenv('INCLUDE_FULL_AREA_IN_AREAS', '0') == '1'

    # folder containing subfolders of ISO 8601 dates (no time) which each contain a shapefile of the zoning for that date
    zoning_input_folder = Path('input/zoning')

    # information related to Greenville County zoning layers
    commercial_zone_codes = [
        'C-1',  # local resident commercial
        'C-2',  # major commercial thoroughfares oriented to customers travelling by automobile
        'C-3',  # light commercial and service land uses oriented to customers travelling by automobile
        'S-4',  # services district: commercial use, selling merchandise related to sergices, light industries, and outdoor warehousing
        'NC',  # convenient shopping areas and professional offices serving the daily needs of nearby neighborhoods
    ]
    zoning_column = 'ZONING'

    # area_name -> trip/population -> season -> stats -> int/float
    stats: dict[str, dict[str, dict[str, dict[str, int | float | None]]]] = {}

    def __init__(self) -> None:
        # collect the paths to each area for processing
        self.areas = [path for path in self.replica_folder.iterdir() if path.is_dir()]
        if not self.include_full_area_in_areas:
            self.areas = [path for path in self.areas if path.name != 'full_area']

        greenlink_gtfs_seasons: list[str] = []
        for gtfs_year_folder in self.greenlink_gtfs_folder.iterdir():
            if not gtfs_year_folder.is_dir():
                continue
            for gtfs_quarter_folder in gtfs_year_folder.iterdir():
                if gtfs_quarter_folder.is_dir() and gtfs_quarter_folder.name in ['Q2', 'Q4']:
                    greenlink_gtfs_seasons.append(
                        f'{gtfs_year_folder.name}_{gtfs_quarter_folder.name}')
        self.greenlink_gtfs_seasons = greenlink_gtfs_seasons

        # collect childcare data paths by season
        childcare_data: dict[str, Path] = {}
        for path in self.geocoder_output_folder.iterdir():
            if path.name.startswith('geocoded_childcare__'):
                year, quarter = extract_season(path.name.split('__')[-1])
                season = f'{year}_{quarter}'
                childcare_data[season] = path
        self.childcare_data = childcare_data

        # collect dental data paths by season
        dental_data: dict[str, Path] = {}
        for path in self.geocoder_output_folder.iterdir():
            if path.name.startswith('geocoded_dental__'):
                year, quarter = extract_season(path.name.split('__')[-1])
                season = f'{year}_{quarter}'
                dental_data[season] = path
        self.dental_data = dental_data

        # collect eye care data paths by season
        eye_care_data: dict[str, Path] = {}
        for path in self.geocoder_output_folder.iterdir():
            if path.name.startswith('geocoded_eye_care__'):
                year, quarter = extract_season(path.name.split('__')[-1])
                season = f'{year}_{quarter}'
                eye_care_data[season] = path
        self.eye_care_data = eye_care_data

        # collect family medicine data paths by season
        family_medicine_data: dict[str, Path] = {}
        for path in self.geocoder_output_folder.iterdir():
            if path.name.startswith('geocoded_family_medicine__'):
                year, quarter = extract_season(path.name.split('__')[-1])
                season = f'{year}_{quarter}'
                family_medicine_data[season] = path
        self.family_medicine_data = family_medicine_data

        # collect free clinics data paths by season
        free_clinics_data: dict[str, Path] = {}
        for path in self.geocoder_output_folder.iterdir():
            if path.name.startswith('geocoded_free_clinics__'):
                year, quarter = extract_season(path.name.split('__')[-1])
                season = f'{year}_{quarter}'
                free_clinics_data[season] = path
        self.free_clinics_data = free_clinics_data

        # collect hospitals data paths by season
        hospitals_data: dict[str, Path] = {}
        for path in self.geocoder_output_folder.iterdir():
            if path.name.startswith('geocoded_hospitals__'):
                year, quarter = extract_season(path.name.split('__')[-1])
                season = f'{year}_{quarter}'
                hospitals_data[season] = path
        self.hospitals_data = hospitals_data

        # collect internal medicine data paths by season
        internal_medicine_data: dict[str, Path] = {}
        for path in self.geocoder_output_folder.iterdir():
            if path.name.startswith('geocoded_internal_medicine__'):
                year, quarter = extract_season(path.name.split('__')[-1])
                season = f'{year}_{quarter}'
                internal_medicine_data[season] = path
        self.internal_medicine_data = internal_medicine_data

        # collect urgent care data paths by season
        urgent_care_data: dict[str, Path] = {}
        for path in self.geocoder_output_folder.iterdir():
            if path.name.startswith('geocoded_urgent_care__'):
                year, quarter = extract_season(path.name.split('__')[-1])
                season = f'{year}_{quarter}'
                urgent_care_data[season] = path
        self.urgent_care_data = urgent_care_data

        # collect grocery store data paths by season
        grocery_store_data: dict[str, Path] = {}
        for path in self.geocoder_output_folder.iterdir():
            if path.name.startswith('geocoded_grocery_stores__'):
                year, quarter = extract_season(path.name.split('__')[-1])
                season = f'{year}_{quarter}'
                grocery_store_data[season] = path
        self.grocery_store_data = grocery_store_data

        # collection zoning data paths by season
        zoning_data: dict[str, Path] = {}
        if self.zoning_input_folder.exists():
            for path in self.zoning_input_folder.iterdir():
                if path.is_dir():
                    year, quarter = extract_season(path.name)
                    season = f'{year}_{quarter}'

                    data_file = next(path.glob('*.shp'), None)
                    if data_file is not None:
                        # ensure the shapefile is valid and contains the zoning column
                        try:
                            gdf = geopandas.read_file(
                                data_file, columns=[self.zoning_column], rows=0)
                            if self.zoning_column in gdf.columns:
                                zoning_data[season] = data_file
                            else:
                                logger.warning(
                                    f'Zoning shapefile {data_file} does not contain the required column {self.zoning_column}. Skipping...')
                        except Exception as e:
                            logger.error(f'Error reading zoning shapefile {data_file}: {e}')
        self.zoning_data = zoning_data

    def run(self) -> Self:
        self.calculate_childcare_access(day='thursday')
        self.calculate_grocery_store_access(day='thursday')
        self.calculate_commercial_zone_access(day='thursday')
        self.calculate_dental_access(day='thursday')
        self.calculate_eye_care_access(day='thursday')
        self.calculate_family_medicine_access(day='thursday')
        self.calculate_free_clinics_access(day='thursday')
        self.calculate_hospitals_access(day='thursday')
        self.calculate_internal_medicine_access(day='thursday')
        self.calculate_urgent_care_access(day='thursday')

        # flatten the stats dictionary to a list of dictionaries for easier processing
        logger.info('Flattening stats dictionary for easier processing...')
        flat_stats: list[dict[str, str | int | float | None]] = []
        for area, data in self.stats.items():
            for replica_table, seasons in data.items():
                for season, stats in seasons.items():
                    flat: dict[str, str | int | float | None] = {
                        'area': area,
                        'replica_table': replica_table,
                        'season': season,
                        'year': int(season.split('_')[0]),
                        'quarter': season.split('_')[1],
                    }
                    for stat_name, value in stats.items():
                        flat[stat_name] = value
                    flat_stats.append(flat)

        # convert the flat stats to a pandas DataFrame
        logger.info('Converting flat stats to pandas DataFrame...')
        stats_df = pandas.DataFrame(flat_stats)

        # for each combination of year, season, and area, save a separate JSON file
        for (year, quarter, area), group_df in stats_df.groupby(['year', 'quarter', 'area']):
            stats_output_path = self.output_folder / \
                str(year) / quarter / area / 'essential_services_stats.json'

            # drop the redundant columns
            group_df = group_df.drop(columns=['year', 'quarter'])

            logger.info(
                f'Saving stats DataFrame for {area} in {year} {quarter} to {stats_output_path}...')
            stats_output_path.parent.mkdir(parents=True, exist_ok=True)
            records = [
                # remove None/null/NA values
                {key: value for key, value in row.items() if pandas.notna(value)}
                for row in group_df.to_dict(orient="records")
            ]

            # save the stats dataframe to an array of objects in a JSON file
            with open(stats_output_path, 'w') as f:
                json.dump(records, f, indent=2)

        # collect all essential_services_stats.json files into a single file for easier consumption
        all_stats_output_path = self.output_folder / 'essential_services_stats.json'
        logger.info(f'Collecting all stats JSON files into {all_stats_output_path}...')
        all_stats: list[dict[str, str | int | float | None]] = []
        for stats_file in self.output_folder.glob('**/essential_services_stats.json'):
            with open(stats_file, 'r') as f:
                file_stats = json.load(f)
                all_stats.extend(file_stats)
        with open(all_stats_output_path, 'w') as f:
            json.dump(all_stats, f, indent=2)

        return self

    def get_trip_data(self, area: Path, day: Literal['saturday', 'thursday'] = 'thursday', *, season: str | None = None) -> Generator[tuple[str, Iterator[Path]], Any, None]:
        """
        Generator that yields paths to trip data files for a given area and day for each season in the south atlantic region.
        """
        trip_folder = area / f'{day}_trip'
        if not trip_folder.exists():
            return

        folder_to_iterate_over = trip_folder / '_chunks' if area.name == 'full_area' else trip_folder

        season_folders = [path for path in folder_to_iterate_over.iterdir() if path.is_dir()]
        seasons = [path.name.replace(f'_{day}_trip', '')[-7:len(path.name)]
                   for path in season_folders]

        if area.name == 'full_area':
            if season is not None:
                yield (season, (area / f'{day}_trip' / '_chunks' / ('south_atlantic_' + season + f'_{day}_trip')).glob('*.parquet'))

            else:
                for season in seasons:
                    season_parquet_files = (
                        area / f'{day}_trip' / '_chunks' / ('south_atlantic_' + season + f'_{day}_trip')).glob('*.parquet')
                    yield (season, season_parquet_files)

        if season is not None:
            yield (season, (area / f'{day}_trip' / ('south_atlantic_' + season) / '_chunks').glob('*.parquet'))

        else:
            for season in seasons:
                season_parquet_files = (
                    area / f'{day}_trip' / ('south_atlantic_' + season) / '_chunks').glob('*.parquet')
                yield (season, season_parquet_files)

    def get_synthetic_population_data(self, area: Path, location: Literal['home', 'school', 'work'], *, season: str | None = None) -> Generator[tuple[str, Path], Any, None]:
        """
        Generator that yields paths to trip data files for a given area and day for each season in the south atlantic region.
        """
        population_folder = area / 'population'
        seasons = [path.name[-7:len(path.name)]
                   for path in population_folder.glob('*_home.parquet')]

        if season is not None:
            yield (season, population_folder / f'south_atlantic_{season}_{location}.parquet')

        else:
            for season in seasons:
                yield (season, population_folder / f'south_atlantic_{season}_{location}.parquet')

    def calculate_childcare_access(self, day: Literal['saturday', 'thursday'] = 'thursday') -> None:
        return self.calculate_access_to_points_of_interest(
            day=day,
            output_name='child_care',
            data_dict=self.childcare_data,
            desert_miles=3,  # I picked a generous distance of 3 miles because most definitions use proximity paired with numer of children within census tract geography, which can be significantly smaller in urban areas and significantly bigger in rural areas
        )

    def calculate_grocery_store_access(self, day: Literal['saturday', 'thursday'] = 'thursday') -> None:
        return self.calculate_access_to_points_of_interest(
            day=day,
            output_name='grocery_store',
            data_dict=self.grocery_store_data,
            desert_miles=1,  # the USDA defines a food desert as an area with no grocery store within 1 mile of a household for urban areas
        )

    def calculate_dental_access(self, day: Literal['saturday', 'thursday'] = 'thursday') -> None:
        return self.calculate_access_to_points_of_interest(
            day=day,
            output_name='dental',
            data_dict=self.dental_data,
            # Same as childcare, I picked a generous distance. Most definitions are based on 30-minute drive time, which does not translate super well here.
            desert_miles=3,
        )

    def calculate_eye_care_access(self, day: Literal['saturday', 'thursday'] = 'thursday') -> None:
        return self.calculate_access_to_points_of_interest(
            day=day,
            output_name='eye_care',
            data_dict=self.eye_care_data,
            # Same as childcare, I picked a generous distance. Most definitions are based on 30-minute drive time, which does not translate super well here.
            desert_miles=3,
        )

    def calculate_family_medicine_access(self, day: Literal['saturday', 'thursday'] = 'thursday') -> None:
        return self.calculate_access_to_points_of_interest(
            day=day,
            output_name='family_medicine',
            data_dict=self.family_medicine_data,
            # Same as childcare, I picked a generous distance. Most definitions are based on 30-minute drive time, which does not translate super well here.
            desert_miles=3,
        )

    def calculate_free_clinics_access(self, day: Literal['saturday', 'thursday'] = 'thursday') -> None:
        return self.calculate_access_to_points_of_interest(
            day=day,
            output_name='free_clinics',
            data_dict=self.free_clinics_data,
            # Same as childcare, I picked a generous distance. Most definitions are based on 30-minute drive time, which does not translate super well here.
            desert_miles=3,
        )

    def calculate_hospitals_access(self, day: Literal['saturday', 'thursday'] = 'thursday') -> None:
        return self.calculate_access_to_points_of_interest(
            day=day,
            output_name='hospitals',
            data_dict=self.hospitals_data,
            # Same as childcare, I picked a generous distance. Most definitions are based on 30-minute drive time, which does not translate super well here.
            desert_miles=3,
        )

    def calculate_internal_medicine_access(self, day: Literal['saturday', 'thursday'] = 'thursday') -> None:
        return self.calculate_access_to_points_of_interest(
            day=day,
            output_name='internal_medicine',
            data_dict=self.internal_medicine_data,
            # Same as childcare, I picked a generous distance. Most definitions are based on 30-minute drive time, which does not translate super well here.
            desert_miles=3,
        )

    def calculate_urgent_care_access(self, day: Literal['saturday', 'thursday'] = 'thursday') -> None:
        return self.calculate_access_to_points_of_interest(
            day=day,
            output_name='urgent_care',
            data_dict=self.urgent_care_data,
            # Same as childcare, I picked a generous distance. Most definitions are based on 30-minute drive time, which does not translate super well here.
            desert_miles=3,
        )

    def calculate_commercial_zone_access(self, day: Literal['saturday', 'thursday'] = 'thursday') -> None:
        return self.calculate_access_to_points_of_interest(
            day=day,
            output_name='commercial_zone',
            data_dict=self.zoning_data,
            # filter to commercial zones
            data_where=f"{self.zoning_column} IN {tuple(self.commercial_zone_codes)}",
            data_where_columns=[self.zoning_column],
            desert_miles=1,  # based on food desert definition
        )

    def calculate_access_to_points_of_interest(
        self,
        day: Literal['saturday', 'thursday'] = 'thursday',
        *,
        output_name: str,
        data_dict: dict[str, Path],
        # A SQL WHERE clause to filter the data. See `pyogrio.read_dataframe` documentation for more details.
        data_where: str | None = None,
        # any columns used in the SQL WHERE clause MUST be included here
        data_where_columns: list[str] = [],
        desert_miles: int = 1
    ) -> None:
        # find the closest avilable POI season for each area dataset
        logger.info(
            f'Finding the temporally closest {output_name} data for each season of {day} trip data for each area...')
        poi_season_per_area_season: dict[str, list[tuple[Path, str]]] = {}
        for area in self.areas:
            trip_data = self.get_trip_data(area, day)

            for season, _ in trip_data:
                # find the closest POI store season
                closest_poi_season = self.find_closest_season(
                    season, list(data_dict.keys()))

                if closest_poi_season is None:
                    logger.warning(
                        f'No POI data available for season {season} in area {area.name}')
                    continue

                # store the area path and season in the dictionary
                if closest_poi_season not in poi_season_per_area_season:
                    poi_season_per_area_season[closest_poi_season] = []
                poi_season_per_area_season[closest_poi_season].append((area, season))

        # process each POI data file for its associated area-season pairs
        logger.info(f'Processing POI data for {day} trip data...')
        for poi_season, area_season_pairs in poi_season_per_area_season.items():
            poi_data_path = data_dict[poi_season]
            year, quarter = poi_season.split('_')
            logger.info(f'Processing POI data from season {poi_season}...')

            # copy the POI data path to the output folder for reference
            for area, season in area_season_pairs:
                season_year, season_quarter = season.split('_')
                output_poi_folder = self.output_folder / season_year / season_quarter
                output_poi_folder.mkdir(parents=True, exist_ok=True)
                file_extension = os.path.splitext(poi_data_path.name)[1]
                output_poi_path = output_poi_folder / (output_name + '.geojson')
                logger.debug(f'Copying POI data to {output_poi_path} for reference...')
                if file_extension == '.geojson':
                    shutil.copy(poi_data_path, output_poi_path)
                else:
                    # convert to geojson
                    poi_gdf = geopandas.read_file(poi_data_path, where=data_where)
                    poi_gdf.to_crs('EPSG:4326').to_file(output_poi_path, driver='GeoJSON')

            # read the POI geometry (we do not care about the other columns)
            poi_gdf = geopandas.read_file(poi_data_path, columns=[
                                          'geometry', *data_where_columns], where=data_where).to_crs('EPSG:4326')

            # require all points or all polygon or multipolygon geometries
            geometry_type = poi_gdf[poi_gdf.geometry.notna()].geometry.geom_type.unique()
            if len(geometry_type) > 2:
                raise ValueError(
                    f'POI data {poi_data_path} contains mixed geometry types: {geometry_type}. Expected all Point or all Polyon/MultiPolygon.')
            if len(geometry_type) == 2 and 'Polygon' not in geometry_type and 'MultiPolygon' not in geometry_type:
                raise ValueError(
                    f'POI data {poi_data_path} contains mixed geometry types: {geometry_type}. Expected all Point or all Polyon/MultiPolygon.')
            if len(geometry_type) == 1 and geometry_type[0] not in ['Point', 'Polygon', 'MultiPolygon']:
                raise ValueError(
                    f'POI data {poi_data_path} contains unsupported geometry type: {geometry_type[0]}. Expected Point or Polygon/MultiPolygon.')
            is_point_geometry = geometry_type[0] == 'Point'

            logger.info('Generating destination zones geometry...')
            if is_point_geometry:
                # buffer the geometry by 400 meters (~ 0.25 miles) to determine the zones
                # that represent possible trip destinations to each POI
                destination_zones = geopandas.GeoDataFrame(
                    geometry=geodesic_buffer_series(poi_gdf.geometry, 400),
                    crs=poi_gdf.crs
                )
            else:
                # if the geometry is a polygon or multipolygon, we can use it directly as the destination zones
                destination_zones = poi_gdf[poi_gdf.geometry.notna(
                )]

            # calculate mean travel time to a POI in the area-season via public transit
            for area, season in area_season_pairs:
                logger.info(
                    f'Calculating mean public transit travel time to POIs for area {area.name} in season {season}...')
                trip_files = next(self.get_trip_data(area, day, season=season))[1]

                # since we a reading in chunks, we need to keep track of the travel duration for each trip accross all chunks
                # in a dictionary where the keys are the times (as integer) and the values are the number of trips with that time
                time_frequencies: dict[int, int] = {}

                destination_zones_for_area = destination_zones.copy()

                # count the time taken for each public transit trip to a POI
                for trip_file in trip_files:
                    dest_columns = ['mode', 'travel_purpose', 'duration_minutes']
                    dest_gdf = read_as_point_geometry(trip_file, xy_columns=(
                        'end_lng', 'end_lat'), xy_crs='EPSG:4326', columns=dest_columns, filters=[('mode', '==', 'PUBLIC_TRANSIT')])

                    # TODO: move this logic to the ETL where it is first downloaded
                    dest_gdf['mode'] = dest_gdf['mode'].astype('category')
                    dest_gdf['travel_purpose'] = dest_gdf['travel_purpose'].astype('category')
                    dest_gdf['duration_minutes'] = dest_gdf['duration_minutes'].astype('short')

                    # filter to trip desinations that are within the POI buffers
                    near_poi_destinations = geopandas.sjoin(
                        dest_gdf, destination_zones_for_area, how='inner', predicate='within')

                    # count found destinations per zone and add to destination_zones_for_area
                    if not near_poi_destinations.empty:
                        # count destinations by zone index
                        zone_counts = near_poi_destinations.groupby('index_right').size()

                        # initialize found_count column if it doesn't exist
                        if 'found_count' not in destination_zones_for_area.columns:
                            destination_zones_for_area['found_count'] = 0

                        # increment counts for zones that had destinations
                        for zone_idx, count in zone_counts.items():
                            idx = zone_idx if isinstance(zone_idx, int) else int(str(zone_idx))
                            current_count = destination_zones_for_area.loc[idx, 'found_count']
                            destination_zones_for_area.loc[idx, 'found_count'] = int(
                                str(current_count)) + count

                    # remove destination points that o=are duplicates (e.g., they are within multiple zones)
                    near_poi_destinations = near_poi_destinations[
                        ~near_poi_destinations.index.duplicated(keep="first")
                    ]

                    # add the travel time for each trip to the time_frequencies dictionary
                    durations_frequencies = near_poi_destinations.groupby(
                        'duration_minutes').size().to_dict()
                    for duration, frequency in durations_frequencies.items():
                        if duration in time_frequencies:
                            time_frequencies[duration] += frequency
                        else:
                            time_frequencies[duration] = frequency

                logger.info(
                    f'Saving POI destination geometry for area {area.name} in season {season}...')
                area_season_year, area_season_quarter = season.split('_')
                output_folder = self.output_folder / area_season_year / area_season_quarter / area.name
                output_folder.mkdir(parents=True, exist_ok=True)
                destination_zones_for_area.to_file(
                    output_folder / f'{output_name}__destination_zones.geojson', index=False)

                # calculate the mean travel time for this area-season pair
                weighted_sum = sum(duration * frequency for duration,
                                   frequency in time_frequencies.items())
                total_trips = sum(time_frequencies.values())
                if total_trips > 0:
                    mean_travel_time = weighted_sum / total_trips
                else:
                    mean_travel_time = None

                self.stats.setdefault(area.name, {})
                self.stats[area.name].setdefault(f'{day}_trip', {})
                self.stats[area.name][f'{day}_trip'].setdefault(season, {})
                self.stats[area.name][f'{day}_trip'][season][f'{output_name}__mean_travel_time'] = mean_travel_time

            logger.info(f'Generating access zones geometry...')
            # buffer the geometry by 1 mile to determine the zone that indicates
            # reasonable access to each POI
            mile_in_meters = 1609.344
            access_zones = geopandas.GeoDataFrame(
                geometry=geodesic_buffer_series(
                    poi_gdf.geometry, desert_miles * mile_in_meters),
                crs=poi_gdf.crs
            ).dissolve().explode().reset_index(drop=True)

            # clip the access zones to the walk_serivce_area so it excludes people
            # who do not live within reasonable walking distance of bus stops
            walk_service_area_season = self.find_closest_season(
                f'{year}_{quarter}',
                self.greenlink_gtfs_seasons
            )
            if walk_service_area_season is None:
                logger.warning(
                    f'No walk service area data available for season {year}_{quarter}. Skipping proportional access calculation...')
                continue
            wsa_year, wsa_quarter = walk_service_area_season.split('_')
            walk_service_area_gdf = geopandas.read_file(
                self.greenlink_gtfs_folder / wsa_year / wsa_quarter / 'walk_service_area.geojson').to_crs('EPSG:4326')
            access_zones = geopandas.overlay(
                access_zones, walk_service_area_gdf, how='intersection')

            # calculate the proportion of the population with reasonable access to at least one POI
            for area, season in area_season_pairs:
                logger.info(
                    f'Calculating proportion of population with access to at least one POI for area {area.name} in season {season}...')

                access_zones_for_area = access_zones.copy()

                logger.debug(
                    f'Reading synthetic population home locations for area {area.name} in season {season}...')
                population_data_path = next(
                    self.get_synthetic_population_data(area, 'home', season=season))[1]
                population_home_locations = geopandas.read_file(
                    population_data_path, columns=['geometry']).to_crs('EPSG:4326').reset_index()

                logger.debug(
                    f'Filtering population home locations to those within the POI access zones for area {area.name} in season {season}...')
                population_within_access = geopandas.sjoin(
                    population_home_locations, access_zones_for_area, how='inner', predicate='within')

                # count found population per zone and add to destination_zones_for_area
                if not population_within_access.empty:
                    # count destinations by zone index
                    zone_counts = population_within_access.groupby('index_right').size()

                    # initialize found_count column if it doesn't exist
                    if 'found_count' not in access_zones_for_area.columns:
                        access_zones_for_area['found_count'] = 0

                    # increment counts for zones that had destinations
                    for zone_idx, count in zone_counts.items():
                        idx = zone_idx if isinstance(zone_idx, int) else int(str(zone_idx))
                        current_count = access_zones_for_area.loc[idx, 'found_count']
                        access_zones_for_area.loc[idx, 'found_count'] = int(
                            str(current_count)) + count

                logger.info(
                    f'Saving POI access geometry for area {area.name} in season {season}...')
                area_season_year, area_season_quarter = season.split('_')
                output_folder = self.output_folder / area_season_year / area_season_quarter / area.name
                output_folder.mkdir(parents=True, exist_ok=True)
                access_zones.to_file(
                    output_folder / f'{output_name}__access.geojson', index=False)

                proportion_with_access = len(population_within_access) / \
                    len(population_home_locations)
                self.stats.setdefault(area.name, {})
                self.stats[area.name].setdefault('population', {})
                self.stats[area.name]['population'].setdefault(season, {})
                self.stats[area.name]['population'][season][f'{output_name}__access_fraction'] = proportion_with_access

    def find_closest_season(self, target_season: str, available_seasons: list[str]) -> str | None:
        """
        Finds the closest season to the target season from the available seasons.
        Seasons are in the format 'YYYY_Q2' or 'YYYY_Q4'.
        """
        target_year_str, target_quarter = target_season.split('_')
        target_year = int(target_year_str)

        # if there is a perfect match, return it
        if target_season in available_seasons:
            return target_season

        # sort available seasons by year and quarter
        available_seasons.sort(key=lambda s: (int(s.split('_')[0]), s.split('_')[1]))

        # split the available seasons into years and quarters
        available_season_parts_ = [season.split('_') for season in available_seasons]
        available_season_parts = [(int(year), quarter)
                                  for year, quarter in available_season_parts_]

        # find the closest season
        closest_season: str | None = None
        closest_distance = float('inf')
        for year, quarter in available_season_parts:
            distance = abs(year - target_year) + (0 if quarter == target_quarter else 1)
            if distance < closest_distance:
                closest_distance = distance
                closest_season = f'{year}_{quarter}'

        return closest_season


def extract_season(iso8601_date: str) -> tuple[int, Literal['Q2', 'Q4']]:
    """
    Extracts the year and season (Q2 or Q4) from an ISO 8601 date string.

    Args:
        iso8601_date (str): The ISO 8601 date string. DO NOT include the time part.

    Returns:
        tuple[int, Literal['Q2', 'Q4']]: A tuple containing the year and season.
    """
    year = int(iso8601_date[:4])
    month = int(iso8601_date[5:7])
    season: Literal['Q2', 'Q4'] = 'Q2' if month in [1, 2, 3, 4, 5, 6] else 'Q4'
    return (year, season)


def read_as_point_geometry(path: Path | str, xy_columns: tuple[str, str], xy_crs: CRS | str, *, columns: list[str], filters: list[tuple[str, str, str]] | None = None) -> geopandas.GeoDataFrame:
    # read the CRS from the geoparquet file since we will lose it when we read it with pandas instead of geopandas
    metadata = pyogrio.read_info(path)
    crs = metadata['crs']

    # read the data with pandas
    columns_to_read = [*columns, *xy_columns]
    df = pandas.read_parquet(path, columns=columns_to_read, filters=filters)

    # convert to a GeoDataFrame where the xy_columns are used for the point geometry
    gdf = geopandas.GeoDataFrame(df, geometry=geopandas.points_from_xy(
        df[xy_columns[0]], df[xy_columns[1]]), crs=xy_crs, columns=columns)

    return gdf
