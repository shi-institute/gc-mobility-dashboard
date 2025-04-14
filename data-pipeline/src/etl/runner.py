

from etl.sources.greenlink_gtfs.etl import GreentlinkGtfsETL


def etl_runner():
    """
    Run the ETL (extract, transform, and load) pipeline for all sources.
    """

    GreentlinkGtfsETL().run()
