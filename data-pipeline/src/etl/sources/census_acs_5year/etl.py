import json
import os
import shutil
from typing import Literal, Optional, Self

import pandas

from etl.convert import convert_string_columns_to_numeric
from etl.downloader import Downloader
from etl.sources.census_acs_5year.constants import (CensusDataTableInfo,
                                                    CensusDataTableName,
                                                    tables)

VariableLabels = dict[str, dict[Literal['label', 'concept'], str]]


class CensusACS5YearEstimatesETL:
    table: CensusDataTableName
    table_info: CensusDataTableInfo
    table_folder_path: str
    download_directory: str = './data/census_acs_5year'
    years: list[int]
    api_key: str = os.getenv('CENSUS_API_KEY') or ''
    time_series_file_path: str

    def __init__(self, table: CensusDataTableName):
        self.table = table
        self.table_info = tables[table]
        self.table_folder_path = f'{self.download_directory}/{self.table}'
        self.time_series_file_path = f'{self.table_folder_path}/time_series.json'

    def run(self, years: Optional[list[int]] = None) -> Self:
        if years is None:
            years = self.table_info['years']
        self.years = years

        self._download()
        self._get_variable_labels()

        return self

    def _download(self) -> None:
        """
        Download the Census ACS 5-Year Estimates data for the specified years.

        Args:
            years (list[int]): List of years to download data for. 
        """

        # if the directory for this table already exists, delete it
        if os.path.exists(self.table_folder_path):
            shutil.rmtree(self.table_folder_path)

        # download the data for each year
        for year in self.years:
            url = self.table_info['data'].format(
                year=year) + f'&key={self.api_key}'
            download_file_path = f'{self.table_folder_path}/{year - 4}-{year}.json'

            print(f"Downloading data from {url}")
            Downloader(
                url,
                download_file_path
            ).download()

            convert_census_lenght1_2d_array_to_object_array(download_file_path)

    def _get_variable_labels(self) -> None:
        """
        Get the variable labels for the specified table.

        Returns:
            pandas.DataFrame: DataFrame containing the variable labels.
        """
        for year in self.years:
            variables_key = '_'.join(
                self.table_info['variables'].split('/')[5:])
            variables_destination_path = f'{self.download_directory}/variables/{variables_key}__{year - 4}-{year}.json.tmp'

            if not os.path.exists(variables_destination_path):
                # download the variables file
                url = self.table_info['variables'].format(year=year)
                download_file_path = variables_destination_path.replace(
                    '.json', '__raw.json')
                Downloader(url, download_file_path).download()

                # parse the variables file into a key-value pair
                df = pandas.read_json(download_file_path)
                df.columns = df.iloc[0]
                df = df[1:]
                df = df.set_index('name')
                df.to_json(variables_destination_path,
                           orient='index', indent=2)

                # delete the unparsed file
                os.remove(download_file_path)

                print(
                    f"Parsed variables file and saved to {variables_destination_path}")

            # read the dataset variables file
            all_variables: VariableLabels
            with open(variables_destination_path, 'r') as file:
                all_variables = json.load(file)

            # read the variables in the downloaded data file
            data_file_path = f'{self.table_folder_path}/{year - 4}-{year}.json'
            keys: list[str] = []
            with open(data_file_path, 'r') as file:
                parsed: list[dict[str, str]] = json.load(file)
                keys = list(parsed[0].keys())

            # filter the variables to only include the ones in the table
            data_variables = {
                k: v['label'] for k, v in all_variables.items() if k in keys
            }

            # sort the variables by key such that the the order
            # follows alphabetical order at each depth level
            # (each depth level is separated by !!)
            def sort_key(item):
                value = item[1]
                parts = value.split('!!')
                return parts  # sort by each part of the string
            sorted_data_variables = dict(
                sorted(data_variables.items(), key=sort_key))

            # write the filtered variables to a new file
            filtered_variables_path = data_file_path.replace(
                '.json', '.variables')
            with open(filtered_variables_path, 'w') as file:
                json.dump(sorted_data_variables, file, indent=2)

    def to_time_series(self) -> Self:
        """
        Construct a time series file from the downloaded data.
        The time series file is a JSON file that contains all the data for
        the specified years in a single array.
        The time series file is saved in the same directory as the downloaded
        data files unless a path is specified.
        The time series file is named time_series.json by default.
        """
        time_series_file_path = f'{self.table_folder_path}/time_series.json'

        with open(time_series_file_path, 'w') as file:
            # write the start of the array
            file.write('[\n')

            # read each year's data file and write it to the time series file
            for year in self.years:
                year_file_path = f'{self.table_folder_path}/{year - 4}-{year}.json'
                with open(year_file_path, 'r') as year_file:
                    # read the year file and write it to the time series file
                    data = json.load(year_file)
                    for row in data:
                        # add the year to each row
                        row['YEAR'] = f'{year - 4}-{year}'

                        # write the row to the time series file
                        json_string = json.dumps(row, sort_keys=True, indent=2)
                        indented_json_strings = [
                            '  ' + line for line in json_string.splitlines()]
                        indented_json_string = '\n'.join(indented_json_strings)
                        file.write(indented_json_string)

                        # separate the objects with a comma
                        # unless it is the last object in the file
                        if row == data[-1] and year == self.years[-1]:
                            file.write('\n')
                        else:
                            file.write(',\n')

            # write the end of the array
            file.write(']\n')

        print(f"Time series data written to {time_series_file_path}")
        return self

    def prune_tables(self) -> Self:
        """
        Remove columns except the ones specified in the table info.
        """

        if tables[self.table]['columns'] is None:
            print(f"Table {self.table} has no columns to prune.")
            return self

        for year in self.years:
            dataset_file_path = f'{self.table_folder_path}/{year - 4}-{year}.json'
            df = pandas.read_json(dataset_file_path, dtype=False)

            # drop columns not in the table info
            columns_to_keep = [name for name,
                               alias in self.table_info['columns']] + ['NAME', 'ucgid']
            df = df[columns_to_keep]

            # calculate the GEOID
            if 'GEOID' not in df.columns:
                df['GEOID'] = df.apply(calculate_geoid, axis=1)

            # rename columns to match the alias in the table info
            df = df.rename(
                columns={name: alias for name,
                         alias in self.table_info['columns']}
            )

            df.to_json(dataset_file_path, orient='records', indent=2,)
            print(
                f"Pruned {dataset_file_path}")

        return self


def convert_census_lenght1_2d_array_to_object_array(filepath: str) -> None:
    """
    Converts the Census API's two dimensional JSON arrays into a more
    standard array of objects.

    **DANGER: This function accepts a file path and directly modifies it.**
    """

    # read the json with pandas
    df = pandas.read_json(filepath, dtype=False)  # do not convert strings

    # tell pandas that the first row is actually the header row
    df.columns = df.iloc[0]
    df = df[1:]

    # ensure the numeric columns are converted to numeric types
    df = convert_string_columns_to_numeric(df)

    # overwrite the file with the new json
    df.to_json(filepath, orient='records', indent=2)


def calculate_geoid(row: dict[str, str]) -> None | str:
    """
    Calculate the GEOID from the ucgid field.
    """
    ucgid = row['ucgid']

    if 'US' not in ucgid:
        return None

    # census tracts
    if ucgid.startswith('1400000US'):
        return 'T' + ucgid.split('US')[1]

    return None
