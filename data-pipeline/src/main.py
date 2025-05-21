import argparse
import os
import sys
from typing import Optional

import pandas_gbq
import pydata_google_auth
from dotenv import load_dotenv

from etl.runner import etl_runner

if __name__ == "__main__":
    # check if the script is running in docker
    docker = False
    if os.path.exists('/.dockerenv'):
        docker = True

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

    # if etls argument is provided, split it into a list of strings
    etls: Optional[list[str]] = None
    if args.etls:
        etls = [string.strip() for string in args.etls.split(',')]

    print("Checking credentials...")
    try:
        credentials = pydata_google_auth.load_user_credentials(
            './credentials/bigquery_credentials.json')
        pandas_gbq.context.credentials = credentials
    except (Exception) as e:
        print("Credentials not found. Please run the authentication script.")
        exit(1)

    # run the ETL pipeline
    etl_runner(etls)
    print('\nDONE')
