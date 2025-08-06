"""
Census tract geometry ETL pipeline for Greenville County, SC.
Downloads tract boundaries and spatially intersects with user areas.
"""

import json
import logging
import os
from pathlib import Path
from typing import Self

import geopandas
import pandas
import requests

from etl.sources.census_acs_5year.constants import tiger_web_tracts_services

logger = logging.getLogger('census_tract_matcher')
logger.setLevel(logging.DEBUG)


class CensusIntersectAreasETL:
    """Downloads census tract geometries and performs spatial intersection with user areas."""

    download_directory: str = './data/census_acs_5year'
    output_folder = './data/census_acs_5year'
    areas_folder: str = './input/replica_interest_area_polygons'
    time_series_file_path = f"{output_folder}/geometry/tracts/time_series.json"
    years = list(sorted(tiger_web_tracts_services.keys()))
    areas: list[tuple[Path, str]]

    def __init__(self, area_geojson_paths: list[str] | list[Path]) -> None:
        """Initialize ETL pipeline and create output directories."""
        Path(self.output_folder).mkdir(parents=True, exist_ok=True)
        Path(f"{self.output_folder}/tracts_geometry").mkdir(parents=True, exist_ok=True)

        area_geojson_paths = [Path(path) for path in area_geojson_paths]
        area_names = [os.path.splitext(path.name)[0] for path in area_geojson_paths]
        self.areas = list(zip(area_geojson_paths, area_names))

    def run(self) -> Self:
        """
        Downloads census tract geometries for the available years, intersects with
        the area geometries, and saves an array of results in JSON.

        Access the output file path from `self.time_series_file_path`.
        """
        logger.info(
            f'Retrieving census tract geometries for Greenville County, SC for years {self.years[0]}-{self.years[-1]}...')
        self.download_tract_geometries()

        results: list[list[dict[str, str | int | list[str]]]] = []
        for year in self.years:
            results.append(
                self.intersect_with_areas(year, use_acs_year_range_for_year=True)
            )

        # save the results as a single JSON file
        logger.info("Saving results to time_series.json...")
        merged_results = [item for sublist in results for item in sublist]
        with open(self.time_series_file_path, 'w') as file:
            json.dump(merged_results, file)

        return self

    def download_tract_geometries(self) -> None:
        """
        Download census tract polygons for Greenville County, SC.

        Saves each year as a separate GeoJSON file. The GEOID column is prefixed with 'T' for tract.
        """

        successful_years = []
        total_tracts = 0

        for year, config in tiger_web_tracts_services.items():
            logger.info(f"  Downloading {year}...")

            url = f"https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/{config['service']}/MapServer/{config['layer_id']}/query"
            params = {
                "where": "STATE = '45' AND COUNTY = '045'",
                "outFields": "GEOID",
                "returnGeometry": "true",
                "f": "geojson"
            }

            try:
                response = requests.get(url, params=params, timeout=30)
                response.raise_for_status()

                data = response.json()
                if 'error' in data:
                    logger.error(f"  ✗ API error: {data['error'].get('message', 'Unknown error')}")
                    continue

                # create a GeoDataFrame from the feature collection
                gdf = geopandas.GeoDataFrame.from_features(data, crs='EPSG:4326')

                # prefix the GEOID with 'T' for tract
                gdf['GEOID'] = 'T' + gdf['GEOID'].astype(str)

                # save the geodataframe to a GeoJSON file
                output_path = Path(f"{self.output_folder}/geometry/tracts/{year}.geojson")
                output_path.parent.mkdir(parents=True, exist_ok=True)
                gdf.to_file(output_path, driver='GeoJSON')

                logger.info(f"Saved {len(gdf)} tracts to {output_path}")

                features = data.get('features', [])
                if not features:
                    logger.debug(f"  ✗ No features returned")
                    continue

                logger.debug(f"  ✓ Got {len(features)} tracts")

                year_dict = {}
                for feature in features:
                    geoid = feature['properties'].get('GEOID')
                    if geoid:
                        year_dict[f'T{geoid}'] = {
                            "year": year,
                            "geometry": feature['geometry']
                        }

                if not year_dict:
                    logger.debug(f"  ✗ No valid GEOIDs found")
                    continue

                year_file = Path(f"{self.output_folder}/tracts_geometry/{year}.geojson")
                with open(year_file, 'w') as f:
                    json.dump(year_dict, f, separators=(',', ':'))

                logger.debug(f"  ✓ Saved {len(year_dict)} tracts to {year_file.name}")
                successful_years.append(year)
                total_tracts += len(year_dict)

            except requests.exceptions.Timeout:
                logger.error(f"  ✗ Request timeout for {year}")
            except requests.exceptions.RequestException as e:
                logger.error(f"  ✗ Request failed for {year}: {e}")
            except json.JSONDecodeError:
                logger.error(f"  ✗ Invalid JSON response for {year}")
            except IOError as e:
                logger.error(f"  ✗ File write error for {year}: {e}")

        if successful_years:
            logger.info(
                f"\n✓ Downloaded {total_tracts} total tracts from years {successful_years}")
        else:
            logger.error("\n✗ No data downloaded successfully")

    def intersect_with_areas(self, year: int = 2020, *, use_acs_year_range_for_year: bool = False) -> list[dict[str, str | int | list[str]]]:
        """
        Spatially intersect areas with census tracts to assign GEOIDs.

        Args:
            areas_folder_path: Folder containing GeoJSON files
            year: Year of tract boundaries to use (default: 2020)

        Returns:
            dict: Mapping of area names to tract GEOIDs
        """
        logger.info(f'Finding tracts that intersect with input areas for {year}...')

        # Load tract geometries
        tract_file = Path(f"{self.output_folder}/geometry/tracts/{year}.geojson")
        logger.debug(f"  Loading tract geometries from {tract_file}...")
        tract_gdf = geopandas.read_file(tract_file)
        logger.debug(f"    Loaded {len(tract_gdf)} census tracts")

        logger.debug(f"    Found {len(self.areas)} files to process")

        all_area_intersections: list[tuple[str, list[str]]] = []

        for area_geojson_path, area_name in self.areas:
            logger.info(f"  Processing {area_name}...")

            try:
                area_gdf = geopandas\
                    .read_file(area_geojson_path, columns=['geometry'])\
                    .to_crs('EPSG:4326')\
                    .dissolve()
                if area_gdf.empty:
                    logger.error(f"  ✗ Empty file")
                    continue

                # get the rows from the tract GeoDataFrame that intersect with the area
                logger.debug(f"    Intersecting {area_name} with tracts...")
                intersection_gdf = area_gdf.sjoin(tract_gdf, how='left', predicate='intersects')
                logger.debug(
                    f"      Found {len(intersection_gdf)} tracts intersecting {area_name}")

                # get the GEOIDs from the intersection
                intersected_geoids = intersection_gdf['GEOID'].unique()
                all_area_intersections.append((area_name, intersected_geoids.tolist()))

            except Exception as e:
                logger.error(f"  ✗ Error processing {area_name}: {e}")
                continue

        # re-shape the intersection results so that each GEOID is a unique row, and the area names are stored as a list-like structure
        logger.info("  Associating areas with GEOIDs...")

        # read the results into a DataFrame for easier manipulation
        area_intersections_df = pandas.DataFrame(
            all_area_intersections,
            columns=['area_name', 'GEOID']
        )

        # explode the GEOIDs into separate rows
        area_intersections_df = area_intersections_df.explode('GEOID').reset_index(drop=True)

        # group by GEOID and then aggregate the area names into a list
        area_intersections_df = area_intersections_df\
            .groupby('GEOID')['area_name']\
            .apply(list)\
            .reset_index()\
            .rename(columns={'area_name': 'areas'})

        # add a YEAR column for reference
        area_intersections_df['YEAR'] = year if not use_acs_year_range_for_year else f"{year - 4}-{year}"

        return list(area_intersections_df.to_dict(orient='records'))  # type: ignore
