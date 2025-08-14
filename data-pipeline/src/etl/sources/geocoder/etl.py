import json
import time
from pathlib import Path

import geopandas
import pandas
import requests
from shapely.geometry import Point


class GeocoderETL:
    """Robust geocoding ETL with ArcGIS and Nominatim fallback."""

    input_folder = Path('./input/to_geocode')
    output_folder = Path('./data/geocoded')
    geocoder_url = "https://www.gcgis.org/arcgis/rest/services/GVL_COMPOSITE_LOC/GeocodeServer/geocodeAddresses"
    nominatim_url = "https://nominatim.openstreetmap.org/search"

    def __init__(self):
        self.output_folder.mkdir(parents=True, exist_ok=True)

    def run(self) -> bool:
        try:
            csv_files = list(self.input_folder.glob("*.csv"))
            if not csv_files:
                print(f"⚠ No CSV files found in {self.input_folder}")
                return True
        except Exception as e:
            print(f"⚠ Cannot access input folder: {e}")
            return False

        success = True

        for file in csv_files:
            print(f"Processing {file.name}...")

            try:
                # Read and validate CSV
                try:
                    df = pandas.read_csv(file, on_bad_lines='skip')
                except UnicodeDecodeError:
                    df = pandas.read_csv(file, on_bad_lines='skip', encoding='latin-1')

                if df.empty:
                    print(f"⚠ {file.name} is empty")
                    success = False
                    continue

                # Standardize columns
                col_map = {'ZIP Code': 'ZIP', 'Street': 'Address',
                           'Zip': 'ZIP', 'ADDRESS': 'Address', 'ZIPCODE': 'ZIP'}
                df = df.rename(columns=col_map)

                if 'Address' not in df.columns:
                    print(f"⚠ {file.name} missing Address/Street column")
                    success = False
                    continue

                # Clean data
                df = df.dropna(subset=['Address']).reset_index(drop=True)
                df = df[df['Address'].astype(str).str.strip().str.len() > 0].reset_index(drop=True)

                if df.empty:
                    print(f"⚠ {file.name} has no valid addresses")
                    success = False
                    continue

                print(f"✔ Geocoding {len(df)} addresses")

                # Primary ArcGIS geocoding
                try:
                    # Build request
                    records = []
                    for idx, row in df.iterrows():
                        attrs = {"OBJECTID": idx, "Street": str(row['Address']).strip()}
                        if pandas.notna(row.get('ZIP')):
                            try:
                                attrs["ZIP"] = str(int(float(row['ZIP'])))
                            except:
                                attrs["ZIP"] = str(row['ZIP']).strip()
                        records.append({"attributes": attrs})

                    # Send request
                    data = {'addresses': json.dumps(
                        {"records": records}), 'f': 'json', 'outSR': '4326'}
                    response = requests.post(self.geocoder_url, data=data, timeout=60)

                    if response.status_code != 200:
                        raise Exception(f"ArcGIS returned {response.status_code}")

                    result = response.json()
                    if 'locations' not in result:
                        raise Exception("No locations in ArcGIS response")

                    # Process ArcGIS results
                    geocode_results = []
                    failed_addresses = []
                    successful_count = 0

                    for loc in result['locations']:
                        idx = loc['attributes']['ResultID']

                        if (loc.get('location') and
                            str(loc['location'].get('x', 'NaN')).lower() != 'nan' and
                            str(loc['location'].get('y', 'NaN')).lower() != 'nan' and
                                loc.get('score', 0) > 0):

                            try:
                                x, y = float(loc['location']['x']), float(loc['location']['y'])
                                if -180 <= x <= 180 and -90 <= y <= 90:
                                    geom = Point(x, y)
                                    successful_count += 1
                                else:
                                    geom = None
                            except:
                                geom = None
                        else:
                            geom = None

                        geocode_results.append({'index': idx, 'geometry': geom})

                        if not geom and idx < len(df):
                            row = df.iloc[idx].copy()
                            row['nominatim_success'] = False
                            failed_addresses.append(row)

                except Exception as e:
                    print(f"⚠ ArcGIS geocoding failed: {e}")
                    geocode_results = [{'index': i, 'geometry': None} for i in range(len(df))]
                    failed_addresses = df.to_dict('records')
                    successful_count = 0

                print(f"✔ ArcGIS: {successful_count} successful, {len(failed_addresses)} failed")

                # Nominatim fallback
                if failed_addresses:
                    print(f"*Trying Nominatim for {len(failed_addresses)} failed addresses")
                    rescued = self._try_nominatim_geocoding(failed_addresses, geocode_results)
                    successful_count += rescued
                    if rescued > 0:
                        print(f"✔ Nominatim rescued {rescued} addresses")

                print(f"✔ Final: {successful_count}/{len(df)} successful")

                # Merge and save results
                try:
                    result_df = pandas.DataFrame(geocode_results)
                    merged = pandas.merge(df.reset_index(), result_df,
                                          on='index', how='left').set_index('index')

                    gdf = geopandas.GeoDataFrame(merged, crs='EPSG:4326')
                    output_file = self.output_folder / f"geocoded_{file.stem}.geojson"
                    gdf.to_file(output_file, driver='GeoJSON')
                    print(f"✔ Saved to {output_file}")

                    # Save failed addresses
                    final_failed = [f for f in failed_addresses if not f.get(
                        'nominatim_success', False)]
                    if final_failed:
                        failed_df = pandas.DataFrame(final_failed)
                        failed_file = self.output_folder / f"failed_{file.stem}.csv"
                        failed_df.to_csv(failed_file, index=False)
                        print(f"✔ Failed records: {failed_file}")

                except Exception as e:
                    print(f"⚠ Save error: {e}")
                    success = False

            except Exception as e:
                print(f"⚠ Error processing {file.name}: {e}")
                success = False

        return success

    def _try_nominatim_geocoding(self, failed_addresses: list, geocode_results: list) -> int:
        """Try geocoding failed addresses using Nominatim fallback."""
        rescued = 0

        for i, addr in enumerate(failed_addresses):
            try:
                # Build query
                parts = [str(addr['Address']).strip()]
                if pandas.notna(addr.get('ZIP')):
                    parts.append(str(addr['ZIP']).strip())

                query = ", ".join(p for p in parts if p and p.lower() not in ['nan', 'none'])
                if not query:
                    continue

                # Request with rate limiting
                time.sleep(1)
                params = {'q': query, 'format': 'json', 'limit': 1}
                headers = {'User-Agent': 'GeocoderETL/1.0'}

                response = requests.get(self.nominatim_url, params=params,
                                        headers=headers, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    if data and isinstance(data, list) and len(data) > 0:
                        try:
                            lat, lon = float(data[0]['lat']), float(data[0]['lon'])
                            if -180 <= lon <= 180 and -90 <= lat <= 90:
                                # Update results
                                orig_idx = getattr(addr, 'name', i)
                                for r in geocode_results:
                                    if r['index'] == orig_idx:
                                        r['geometry'] = Point(lon, lat)
                                        break

                                addr['nominatim_success'] = True
                                rescued += 1
                        except:
                            pass
            except:
                pass

        return rescued
