import os
from pathlib import Path
from typing import Self

import geopandas
import pandas


class GreenlinkRidershipETL:
    input_folder = Path('./input/greenlink_ridership')
    output_folder = Path('./data/greenlink_ridership')
    output_file = Path('./data/greenlink_ridership/ridership_data.json')
    polygons_folder = Path('./input/replica_interest_area_polygons')
    greenlink_gtfs_folder = Path('./data/greenlink_gtfs')
    include_full_area_in_areas = os.getenv('INCLUDE_FULL_AREA_IN_AREAS', '0') == '1'

    def __init__(self):
        """
        ETL module to process Greenlink ridership CSVs.

        Reads multiple raw CSVs, cleans and validates data,
        standardizes columns, and outputs combined JSON.

        Input columns include period, stop_point, and ridership counts.

        Combined output file: ./data/greenlink_ridership/ridership_data.json

        Seasonal output files: ./data/greenlink_ridership/{year}/{quarter}/ridership.json
        """

        self.output_file.parent.mkdir(parents=True, exist_ok=True)

    def run(self) -> bool:
        """Process all CSV files and export to JSON"""

        if not self.input_folder.exists():
            print(f"⚠ ERROR. Input folder {self.input_folder} does not exist.")
            return False

        all_data: list[pandas.DataFrame] = []
        processed_files: int = 0

        for file in self.input_folder.glob("*.csv"):
            print(f"Reading {file.name}...")
            try:
                df = pandas.read_csv(file, on_bad_lines='skip')
                print(f"✔︎ Successfully read {file.name} containing {len(df)} rows.")

                df.columns = df.columns.str.strip()
                df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

                required_columns = [
                    'Period',
                    'Stop Point',
                    'Ridership - Boarding - APC',
                    'Ridership - Alighting - APC'
                ]

                missing = [c for c in required_columns if c not in df.columns]
                if missing:
                    print(f"⚠ ERROR. {file.name}: Missing required columns: {missing}")
                    continue

                df = df.rename(columns={
                    'Period': 'period',
                    'Stop Point': 'stop_point',
                    'Ridership - Boarding - APC': 'boarding',
                    'Ridership - Alighting - APC': 'alighting'
                })

                df = df[['period', 'stop_point', 'boarding', 'alighting']]

                # Parse and format dates
                df['period'] = pandas.to_datetime(df['period'], errors='coerce')
                invalid_dates = df['period'].isna()
                if invalid_dates.any():
                    print(f"⚠ WARNING. {file.name}: Dropped {invalid_dates.sum()} invalid dates.")
                    df = df[~invalid_dates]
                df['period'] = df['period'].dt.strftime('%Y-%m-%d')

                # Clean numeric columns
                for col in ['stop_point', 'boarding', 'alighting']:
                    df[col] = pandas.to_numeric(df[col], errors='coerce')
                    invalid_values = df[col].isna()
                    if invalid_values.any():
                        print(
                            f"⚠ WARNING. {file.name}: Dropped {invalid_values.sum()} rows with non-numeric or missing values in '{col}'.")
                    df = df[~invalid_values]
                    df[col] = df[col].astype('int64')

                if df.empty:
                    print(
                        f"⚠ WARNING. {file.name}: All rows dropped after cleaning — skipping file.")
                    continue

                all_data.append(df)
                processed_files += 1
                print(f"✔︎ SUCCESS. {file.name} processed. Cleaned rows: {len(df)}")

            except Exception as e:
                print(f"⚠ WARNING. Failed to process {file.name}: {str(e)}")
                continue

        if processed_files > 0:
            final_df = pandas.concat(all_data, ignore_index=True)

            try:
                # Save combined output to JSON
                final_df.to_json(
                    self.output_file,
                    orient='records'
                )

                # Save ridership data by season
                self.output_by_season(final_df)

                print(
                    f"✔︎ ALL DATA FILES PROCESSED SUCCESSFULLY. {processed_files} file(s) processed. Combined output saved to {os.path.abspath(self.output_file)}.")

                return True
            except Exception as e:
                print(f"⚠ ERROR. Failed to write JSON output: {str(e)}")
                return False

        print("⚠ WARNING. No valid data processed. Output file was not created.")
        return False

    def output_by_season(self: Self, ridership_df: pandas.DataFrame) -> None:
        """
        Outputs ridership data by season.
        """
        area_polygon_files = [file for file in self.polygons_folder.glob("*.geojson")]
        if not self.include_full_area_in_areas:
            area_polygon_files = [
                path for path in area_polygon_files if path.name != 'full_area.geojson'
            ]

        greenlink_gtfs_years = sorted(
            int(y)
            for y in os.listdir(self.greenlink_gtfs_folder)
            if (Path(self.greenlink_gtfs_folder) / y).is_dir() and y.isdigit()
        )
        greenlink_gtfs_seasons = [(year, quarter)
                                  for year in greenlink_gtfs_years for quarter in ['Q2', 'Q4']]

        for [year, quarter] in greenlink_gtfs_seasons:
            stops_path = Path(f"{self.greenlink_gtfs_folder}/{year}/{quarter}/stops.geojson")

            # If the stops file does not exist, skip this year/quarter
            if not stops_path.exists():
                print(
                    f"⚠ WARNING. Stops file {stops_path} does not exist for year {year} and quarter {quarter}. Skipping.")
                continue

            # Read the stops geojson
            stops_gdf = geopandas.read_file(stops_path)

            # Create a copy of the ridership data for only the current season
            months = ['01', '02', '03', '04', '05', '06'] if quarter == 'Q2' else [
                '07', '08', '09', '10', '11', '12']
            season_ridership_df = ridership_df[ridership_df['period'].str.startswith(f"{year}-")]
            season_ridership_df = season_ridership_df[season_ridership_df['period'].str[5:7].isin(
                months)]
            season_ridership_df = season_ridership_df.copy().reset_index(drop=True)
            season_ridership_df['areas'] = ''

            # If data for this season is empty, skip processing
            if season_ridership_df.empty:
                print(
                    f"⚠ WARNING. No ridership data for year {year} and quarter {quarter}. Skipping.")
                continue

            # Assign an area's name to each stop that falls within the area's polygon
            for polygon_file in area_polygon_files:
                area_gdf = geopandas.read_file(polygon_file)

                # Read the stops geojson and filter it to the polygon area
                stops_gdf = geopandas.read_file(stops_path)
                area_stops_mask = stops_gdf.within(area_gdf.union_all())
                area_stops_gdf = stops_gdf[area_stops_mask]

                # Identify the stops ids in the polygon area and save the area's name to the
                # stop in the season_ridership dataframe (semicolon-delimited for multiple areas)
                area_stop_ids = area_stops_gdf['ID'].unique()
                season_ridership_df.loc[season_ridership_df['stop_point'].isin(
                    area_stop_ids), 'area'] = polygon_file.stem
                mask = season_ridership_df['stop_point'].isin(area_stop_ids)
                season_ridership_df.loc[mask, 'areas'] = season_ridership_df.loc[mask, 'areas'].apply(
                    lambda x: f"{x};{polygon_file.stem}" if x else polygon_file.stem
                )

            # Convert the semicolon-separated areas to a list
            season_ridership_df['areas'] = season_ridership_df['areas'].apply(
                lambda x: [area.strip() for area in x.split(';') if area.strip()]
            )

            # Save the processed data for the current season
            output_json_path = Path(f"{self.output_folder}/{year}/{quarter}/ridership.json")
            output_json_path.parent.mkdir(parents=True, exist_ok=True)
            season_ridership_df.to_json(output_json_path, orient='records')
            print(f"✔︎ Saved ridership data for {year} {quarter} to {output_json_path}")
