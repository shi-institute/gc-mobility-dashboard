

from etl.sources.greenlink_gtfs.etl import GreentlinkGtfsETL


def source_runner():
    GreentlinkGtfsETL().run()
