

import importlib
import os
import sys
from typing import Optional

from etl.merge import merge_json_array_files
from etl.sources.census_acs_5year.etl import CensusACS5YearEstimatesETL
from etl.sources.greenlink_gtfs.etl import GreentlinkGtfsETL

# get the absolute path to the directory containing the source runners
sources_dir = os.path.join(os.path.dirname(__file__), 'sources')

# Add the sources directory to the system path
# This allows Python to find the modules within the subdirectories
sys.path.append(sources_dir)


def load_source_runners():
    """
    Dynamically imports the 'source_runner' function from each runner.py
    file in the subdirectories of src/etl/sources.

    Returns:
        a dictionary where keys are the subdirectory names and values
        are the imported 'source_runner' functions.
    """
    source_runners = {}

    # Iterate through the subdirectories in the sources directory
    for source_name in os.listdir(sources_dir):
        source_path = os.path.join(sources_dir, source_name)

        # Check if it's a directory and contains a runner.py file
        if os.path.isdir(source_path):
            runner_file = os.path.join(source_path, 'runner.py')
            if os.path.exists(runner_file):
                try:
                    # Construct the module name relative to the added path
                    module_name = f"{source_name}.runner"
                    module = importlib.import_module(module_name)

                    # if the module has the source_runner function, load it
                    if hasattr(module, 'source_runner') and callable(module.source_runner):
                        source_runners[source_name] = module.source_runner
                    else:
                        print(
                            f"Warning: {module_name} does not have a 'source_runner' function.")
                except ImportError as e:
                    print(f"Error importing module {source_name}/runner: {e}")
                except Exception as e:
                    print(
                        f"An unexpected error occurred while processing {source_name}/runner: {e}")

    # Remove the sources directory from the system path after importing
    sys.path.remove(sources_dir)

    return source_runners


def etl_runner(etls: Optional[list[str]] = None) -> None:
    """
    Run the ETL (extract, transform, and load) pipeline for each source.

    @param etls: List of ETL source names to run. If None, all sources will be run.
    """
    print("Starting ETL pipeline...")
    loaded_runners = load_source_runners()

    print("\nLoaded source runners:")
    for source_name, runner_func in loaded_runners.items():
        will_run = source_name in etls if etls else True
        print(f"- {source_name}: {runner_func} {'✓' if will_run else '✗'}")

    # run the source runners
    for source_name, runner_func in loaded_runners.items():
        will_run = source_name in etls if etls else True

        # if the source is not in the list of ETLs to run, skip it
        if not will_run:
            print(f"Skipping ETL for {source_name}...")
            continue

        # run the source runner
        print(f"\nRunning ETL for {source_name}...")
        try:
            runner_func()
        except Exception as e:
            print(f"Error running ETL for {source_name}: {e}")
