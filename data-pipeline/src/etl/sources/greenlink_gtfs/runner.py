import os

from etl.sources.greenlink_gtfs.etl import GreentlinkGtfsETL


def source_runner():
    transitland_api_key = os.getenv('TRANSITLAND_API_KEY', None)
    GreentlinkGtfsETL().run(transitland_api_key)
