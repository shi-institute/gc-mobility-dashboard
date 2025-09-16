

from pathlib import Path

from etl.sources.future_routes.etl import FutureRoutesETL

after = ['replica', 'greenlink_gtfs']


def source_runner():
    FutureRoutesETL().run()
