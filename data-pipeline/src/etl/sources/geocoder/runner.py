from .etl import GeocoderETL

def source_runner():
    geocoder = GeocoderETL()
    success = geocoder.run()
    
    if not success:
        raise Exception("Geocoding process failed. Check input data format and ensure required columns (Address/Street and ZIP Code/Zip) are present.")
    
    return success
