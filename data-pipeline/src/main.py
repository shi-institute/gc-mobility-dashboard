import argparse
import logging
import os
import sys
import time
from typing import Optional

import pandas_gbq
import pydata_google_auth
from dotenv import load_dotenv

from etl.runner import etl_runner
from TeeLogger import TeeLogger

pyogrio_logger = logging.getLogger('pyogrio._io')
pyogrio_logger.setLevel(logging.WARNING)

if __name__ == "__main__":
    # check if the script is running in docker
    docker = False
    if os.path.exists('/.dockerenv'):
        docker = True

    # check if the script is running in GitHub Actions
    is_running_in_workflow = os.getenv('IS_GH_WORKFLOW', 'false').lower() == 'true'

    # configure arguments
    parser = argparse.ArgumentParser(
        prog='Greenville Connects Mobility Dashbard Data Pipeline',
        description='This program runs the data pipeline for the Greenville Connects Mobility Dashboard.',
        epilog='Created by The Shi Institute for Sustainable Communities at Furman University. https://shi.institute',
    )
    parser.add_argument(
        '--etls', type=str, help='Comma-separated list of ETL sources to run. If not provided, all sources will be run.')
    args = parser.parse_args()

    # if not running in docker, load the .env file
    if not docker:
        load_dotenv()

    # if not running in docker, prompt whether to run the data pipeline
    if not docker:
        run_pipeline = input("Do you want to run the data pipeline? (Y/n): ")
        if run_pipeline.lower().startswith("conda activate"):
            os.system('clear')
            os.execv(sys.executable, ['python'] + sys.argv)
        elif run_pipeline.lower() == 'y' or run_pipeline == '':
            os.system('clear')
        else:
            print("Exiting the data pipeline.")
            exit(0)

    # redirect stdout to both terminal and log file
    log_folder_path = './data/logs/'
    if not os.path.exists(log_folder_path):
        os.makedirs(log_folder_path)
    current_log_file_count = len([name for name in os.listdir(
        log_folder_path) if os.path.isfile(os.path.join(log_folder_path, name))])
    log_file_path = os.path.join(log_folder_path, f'pipeline-{current_log_file_count}.log')
    sys.stdout = TeeLogger(log_file_path)
    sys.stderr = sys.stdout  # redirect stderr to the same logger

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(name)-24s | %(levelname)-5s | %(message)s',
        handlers=[
            logging.StreamHandler(sys.stderr),
        ]
    )
    logging.addLevelName(logging.WARNING, "WARN")  # shorten WARNING to WARN

    # if etls argument is provided, split it into a list of strings
    etls: Optional[list[str]] = None
    if args.etls:
        etls = [string.strip() for string in args.etls.split(',')]

    if (etls is None or 'replica' in etls):
        print("Checking replica credentials...")
        try:
            credentials = pydata_google_auth.load_user_credentials(
                './credentials/bigquery_credentials.json')
            pandas_gbq.context.credentials = credentials
        except (Exception) as e:
            # check if there is at least one .parquet file in data/replica/full_area
            replica_full_data_dir = './data/replica/full_area'
            replica_full_data_is_available = (
                os.path.isdir(replica_full_data_dir) and
                any(
                    filename.endswith('.parquet')
                    for _, __, files in os.walk(replica_full_data_dir)
                    for filename in files
                )
            )

            print('\n\n' + "-" * 78)
            print("Warning: Google BigQuery credentials are not set (or are expired).")
            if replica_full_data_is_available:
                print('         Full area data will not be downloaded.')
                print('         Available season datasets will be inferred from local files.')
            else:
                print(
                    '         Please run the authentication script to retrieve credentials.')
            print("-" * 78 + '\n\n')
            time.sleep(4) if replica_full_data_is_available else exit(1)

    if (etls is None or 'greenlink_gtfs' in etls):
        # unless running on GitHub Actions, print a warning if the API key is not set
        transitland_api_key = os.getenv('TRANSITLAND_API_KEY', None)
        if transitland_api_key is None:
            print('\n\n' + "-" * 78)
            print(
                "Warning: TRANSITLAND_API_KEY is not set. Current GTFS data will be substituted\n         for historical GTFS data.")
            print("\n         To get the historical GTFS data, set the TRANSITLAND_API_KEY\n         environment variable.")
            print("-" * 78 + '\n\n')

            # wait for 10 seconds before continuing
            if not is_running_in_workflow:
                time.sleep(10)

    # run the ETL pipeline
    etl_runner(etls)
    print('\nDONE')
