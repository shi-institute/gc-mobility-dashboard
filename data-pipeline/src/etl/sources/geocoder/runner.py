from .etl import GeocoderETL

def source_runner():
    return GeocoderETL().run()
