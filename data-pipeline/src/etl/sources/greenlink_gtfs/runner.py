import os

from etl.sources.greenlink_gtfs.etl import GreenlinkGtfsETL


def source_runner():
    transitland_api_key = os.getenv('TRANSITLAND_API_KEY', None)
    GreenlinkGtfsETL().run(transitland_api_key)
