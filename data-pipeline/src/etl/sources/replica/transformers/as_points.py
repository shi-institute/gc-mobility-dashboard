import geopandas
from shapely import Point


def as_points(gdf: geopandas.GeoDataFrame, longitude_col: str, latitude_col: str) -> geopandas.GeoSeries:
    """    Convert longitude and latitude columns in a GeoDataFrame to a GeoSeries of Points.
    Args:
        gdf (geopandas.GeoDataFrame): The GeoDataFrame containing longitude and latitude columns.
        longitude_col (str): The name of the column containing longitude values.
        latitude_col (str): The name of the column containing latitude values.
    Returns:
        geopandas.GeoSeries: A GeoSeries of Points created from the longitude and latitude columns.
    """

    return geopandas.GeoSeries([Point(lon, lat) for lon, lat in zip(gdf[longitude_col], gdf[latitude_col])], crs=gdf.crs)
