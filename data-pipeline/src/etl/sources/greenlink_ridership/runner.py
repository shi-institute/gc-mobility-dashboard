from .etl import GreenlinkRidershipETL

after = ['greenlink_gtfs']


def source_runner():
    return GreenlinkRidershipETL().run()
