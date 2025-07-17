"""
ETL module to process Greenlink ridership CSVs.

Reads multiple raw CSVs, cleans and validates data,
standardizes columns, and outputs combined JSON.

Input columns include period, stop_point, and ridership counts.

Output file: ./data/greenlink_ridership/ridership_data.json
"""

import pandas
from pathlib import Path
import os

class GreenlinkRidershipETL:
    def __init__(self):
        self.input_folder = Path('./input/greenlink_ridership')
        self.output_file = Path('./data/greenlink_ridership/ridership_data.json')
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
                    print(f"⚠ ERROR. {file.name}: Dropped {invalid_dates.sum()} invalid dates.")
                    df = df[~invalid_dates]
                df['period'] = df['period'].dt.strftime('%Y-%m-%d')

                # Clean numeric columns
                for col in ['stop_point', 'boarding', 'alighting']:
                    df[col] = pandas.to_numeric(df[col], errors='coerce')
                    invalid_values = df[col].isna()
                    if invalid_values.any():
                        print(f"⚠ WARNING. {file.name}: Dropped {invalid_values.sum()} rows with non-numeric or missing values in '{col}'.")
                    df = df[~invalid_values]
                    df[col] = df[col].astype('int64')

                if df.empty:
                    print(f"⚠ WARNING. {file.name}: All rows dropped after cleaning — skipping file.")
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
                final_df.to_json(
                    self.output_file,
                    orient='records'
                )
                print(f"✔︎ ALL DATA FILES PROCESSED SUCCESSFULLY. {processed_files} file(s) processed. Output saved to {os.path.abspath(self.output_file)}.")
                return True
            except Exception as e:
                print(f"⚠ ERROR. Failed to write JSON output: {str(e)}")
                return False

        print("⚠ WARNING. No valid data processed. Output file was not created.")
        return False
