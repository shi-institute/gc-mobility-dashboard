"""
Census tract geometry ETL pipeline for Greenville County, SC.
Downloads tract boundaries and spatially intersects with user areas.
"""

import json
import requests
import geopandas as gpd
from pathlib import Path

class CensusIntersectAreasETL:
    """Downloads census tract geometries and performs spatial intersection with user areas."""
    
    download_directory: str = './data/census_acs_5year'
    output_folder = './data/census_acs_5year'
    
    def __init__(self) -> None:
        """Initialize ETL pipeline and create output directories."""
        Path(self.output_folder).mkdir(parents=True, exist_ok=True)
        Path(f"{self.output_folder}/tracts_geometry").mkdir(parents=True, exist_ok=True)
    
    def download_tract_geometries(self) -> None:
        """
        Download census tract boundaries for Greenville County, SC (2019-2024).
        Saves each year as separate GeoJSON file with T+GEOID keys.
        """
        configs = {
            2019: {"layer_id": 8, "service": "tigerWMS_ACS2019"},
            2020: {"layer_id": 6, "service": "tigerWMS_Census2020"},
            2021: {"layer_id": 6, "service": "tigerWMS_ACS2021"},
            2022: {"layer_id": 6, "service": "tigerWMS_ACS2022"},
            2023: {"layer_id": 8, "service": "tigerWMS_ACS2023"},
            2024: {"layer_id": 8, "service": "tigerWMS_ACS2024"}
        }
        
        successful_years = []
        total_tracts = 0
        
        for year, config in configs.items():
            print(f"Downloading {year}...")
            
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
                    print(f"  ✗ API error: {data['error'].get('message', 'Unknown error')}")
                    continue
                
                features = data.get('features', [])
                if not features:
                    print(f"  ✗ No features returned")
                    continue
                
                print(f"  ✓ Got {len(features)} tracts")
                
                year_dict = {}
                for feature in features:
                    geoid = feature['properties'].get('GEOID')
                    if geoid:
                        year_dict[f'T{geoid}'] = {
                            "year": year,
                            "geometry": feature['geometry']
                        }
                
                if not year_dict:
                    print(f"  ✗ No valid GEOIDs found")
                    continue
                
                year_file = Path(f"{self.output_folder}/tracts_geometry/{year}.geojson")
                with open(year_file, 'w') as f:
                    json.dump(year_dict, f, separators=(',', ':'))
                
                print(f"  ✓ Saved {len(year_dict)} tracts to {year_file.name}")
                successful_years.append(year)
                total_tracts += len(year_dict)
                
            except requests.exceptions.Timeout:
                print(f"  ✗ Request timeout for {year}")
            except requests.exceptions.RequestException as e:
                print(f"  ✗ Request failed for {year}: {e}")
            except json.JSONDecodeError:
                print(f"  ✗ Invalid JSON response for {year}")
            except IOError as e:
                print(f"  ✗ File write error for {year}: {e}")
        
        if successful_years:
            print(f"\n✓ Downloaded {total_tracts} total tracts from years {successful_years}")
        else:
            print("\n✗ No data downloaded successfully")
    
    def intersect_with_areas(self, areas_folder_path: str, year: int = 2020) -> dict:
        """
        Spatially intersect areas with census tracts to assign GEOIDs.
        
        Args:
            areas_folder_path: Folder containing GeoJSON files
            year: Year of tract boundaries to use (default: 2020)
            
        Returns:
            dict: Mapping of area names to tract GEOIDs
        """
        print(f"Intersecting areas with {year} census tracts...")
        
        # Load tract geometries
        tract_file = Path(f"{self.output_folder}/tracts_geometry/{year}.geojson")
        if not tract_file.exists():
            raise FileNotFoundError(f"Tract file not found: {tract_file}")
        
        try:
            with open(tract_file, 'r') as f:
                tract_data = json.load(f)
        except (IOError, json.JSONDecodeError) as e:
            raise ValueError(f"Cannot read tract file: {e}")
        
        if not tract_data:
            raise ValueError("Tract file is empty")
        
        # Convert to GeoDataFrame
        tract_features = [
            {
                'type': 'Feature',
                'properties': {'GEOID': geoid},
                'geometry': data['geometry']
            }
            for geoid, data in tract_data.items()
            if data.get('geometry')
        ]
        
        if not tract_features:
            raise ValueError("No valid tract geometries found")
        
        tract_gdf = gpd.GeoDataFrame.from_features(tract_features, crs='EPSG:4326')
        print(f"Loaded {len(tract_gdf)} census tracts")
        
        # Find area files
        areas_folder = Path(areas_folder_path)
        if not areas_folder.exists():
            raise FileNotFoundError(f"Areas folder not found: {areas_folder_path}")
        
        geojson_files = list(areas_folder.glob('*.geojson')) + list(areas_folder.glob('*.json'))
        if not geojson_files:
            raise FileNotFoundError(f"No GeoJSON files found in {areas_folder_path}")
        
        print(f"Found {len(geojson_files)} files to process")
        
        all_area_to_geoid = {}
        all_area_intersections = {}
        
        for geojson_file in geojson_files:
            print(f"\nProcessing {geojson_file.name}...")
            
            try:
                areas_gdf = gpd.read_file(geojson_file)
                if areas_gdf.empty:
                    print(f"  ✗ Empty file")
                    continue
                
                areas_gdf = areas_gdf.to_crs('EPSG:4326')
                print(f"  Loaded {len(areas_gdf)} areas")
                
                intersections = gpd.sjoin(areas_gdf, tract_gdf, how='left', predicate='intersects')
                
                file_intersections = {}
                for idx, row in intersections.iterrows():
                    area_name = (row.get('NAME') or row.get('name') or 
                               row.get('Name') or str(row.get('OBJECTID', f"Area_{idx}")))
                    geoid = row.get('GEOID')
                    
                    unique_key = f"{geojson_file.stem}__{area_name}"
                    
                    if unique_key not in file_intersections:
                        file_intersections[unique_key] = []
                    
                    if geoid and geoid not in file_intersections[unique_key]:
                        file_intersections[unique_key].append(geoid)
                
                all_area_intersections.update(file_intersections)
                
                matched_count = 0
                for area_key, geoids in file_intersections.items():
                    if geoids:
                        all_area_to_geoid[area_key] = geoids[0]
                        matched_count += 1
                        if len(geoids) > 1:
                            print(f"    ℹ {area_key.split('__')[1]} spans {len(geoids)} tracts")
                    else:
                        print(f"    ! {area_key.split('__')[1]} no tract intersection")
                
                print(f"  ✓ Matched {matched_count}/{len(areas_gdf)} areas")
                
            except Exception as e:
                print(f"  ✗ Error processing {geojson_file.name}: {e}")
                continue
        
        print(f"\n✓ Total: {len(all_area_to_geoid)} areas matched to tracts")
        
        # Save results
        results = {
            'area_to_primary_geoid': all_area_to_geoid,
            'area_to_all_geoids': all_area_intersections,
            'year_used': year,
            'files_processed': [f.name for f in geojson_files],
            'total_areas_matched': len(all_area_to_geoid)
        }
        
        try:
            results_file = Path(f"{self.output_folder}/area_geoid_mapping.json")
            with open(results_file, 'w') as f:
                json.dump(results, f, indent=0)
            print(f"✓ Saved mapping to {results_file.name}")
        except IOError as e:
            print(f"✗ Failed to save results: {e}")
        
        return all_area_to_geoid
