"""
ETL module to process Greenlink ridership CSVs.

Reads multiple raw CSVs, cleans and validates data,
standardizes columns, and outputs combined JSON.

Input columns include Period, Stop Point, and ridership counts.

Output file: ./data/greenlink_ridership/ridership_data.json
"""

import pandas as pd
from pathlib import Path
import os

class GreenlinkRidershipETL:
    def __init__(self):
        self.input_folder = Path('./input/greenlink_ridership')
        self.output_file = Path('./data/greenlink_ridership/ridership_data.json')
        self.output_file.parent.mkdir(parents=True, exist_ok=True)

    def run(self):
        """Process all CSV files and export to JSON"""
        
        if not self.input_folder.exists():
            print(f"⚠ ERROR. Input folder {self.input_folder} does not exist.")
            return False
        
        all_data = []
        processed_files = 0
    
        for file in self.input_folder.glob("*.csv"):
            print(f"Reading {file.name}...")
            try:
                df = pd.read_csv(file, on_bad_lines='skip')
                print(f"✔︎ Succesfully read {file.name} containing {len(df)} rows")
                
                df.columns = df.columns.str.strip()
                df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
                
                required_columns = [
                    'Period',
                    'Stop Point',
                    'Ridership - Boarding - APC',
                    'Ridership - Alighting - APC'
                ]

                if not all(col in df.columns for col in required_columns):
                    print(f"⚠ ERROR.{file.name}: Missing required columns")
                    continue
                
                df = df.rename(columns={
                'Stop Point': 'StopPoint',
                'Ridership - Boarding - APC': 'Boarding',
                'Ridership - Alighting - APC': 'Alighting'
                })
                
                # Parse dates
                df['Period'] = pd.to_datetime(df['Period'], errors='coerce')
                invalid_dates = df['Period'].isna()
                if invalid_dates.any():
                    print(f"⚠ ERROR.{file.name}: Dropped {invalid_dates.sum()} invalid dates.")
                    df = df[~invalid_dates]
                df['Period'] = df['Period'].dt.strftime('%Y-%m-%d')
                
                # Clean numeric columns
                for col in ['StopPoint', 'Boarding', 'Alighting']:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                    invalid_values = df[col].isna()
                    if invalid_values.any():
                        print(f"⚠ ALERT.{file.name}: Dropped {invalid_values.sum()} invalid rows with empty or non-numeric values from '{col}' column.")
                    df = df[~invalid_values]
                    df[col] = df[col].astype('int64')

                if df.empty:
                    print(f"⚠ WARNING.{file.name}: All rows dropped after cleaning — skipping file")
                    continue

                all_data.append(df)
                processed_files += 1
                print(f"✔︎ SUCCESS.{file.name} processed. Final cleaned rows: {len(df)}")

            except Exception as e:
                print(f"⚠ WARNING. Failed to process {file.name}: {str(e)}")
                continue

        if processed_files > 0:
            final_df = pd.concat(all_data, ignore_index=True)
            
            try:
                final_df.to_json(
                    self.output_file,
                    orient='records',
                    indent=1
                )
                print(f"✔︎ ALL DATA FILES PROCESSED SUCCESSFULLY. {processed_files} files processed. Output saved to {os.path.abspath(self.output_file)} under file name {self.output_file.name}.")
                return True
            except Exception as e:
                print(f"⚠ ERROR. Failed to write JSON output: {str(e)}")
                return False

        # If no valid data was processed
        print("⚠ WARNING. No valid data processed. Output file was not created.")
        return False
