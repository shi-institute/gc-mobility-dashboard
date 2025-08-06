import geopandas
import pandas
from pyproj import CRS
from shapely import Point


def as_points(df: pandas.DataFrame | geopandas.GeoDataFrame, longitude_col: str, latitude_col: str, crs: CRS | None = None) -> geopandas.GeoSeries:
    """    Convert longitude and latitude columns in a GeoDataFrame to a GeoSeries of Points.
    Args:
        gdf (geopandas.GeoDataFrame | pandas.DataFrame): The DataFrame GeoDataFrame containing longitude and latitude columns.
        longitude_col (str): The name of the column containing longitude values.
        latitude_col (str): The name of the column containing latitude values.
        crs (str | None): The coordinate reference system to assign to the GeoSeries. Must be provided if the input is a DataFrame or the GeoDataFrame does not have a CRS set.
    Returns:
        geopandas.GeoSeries: A GeoSeries of Points created from the longitude and latitude columns.
    """

    if not isinstance(df, (pandas.DataFrame, geopandas.GeoDataFrame)):
        raise TypeError("Input must be a pandas DataFrame or a geopandas GeoDataFrame.")

    if not all(col in df.columns for col in [longitude_col, latitude_col]):
        raise ValueError(f"DataFrame must contain '{longitude_col}' and '{latitude_col}' columns.")

    if crs is None and isinstance(df, geopandas.GeoDataFrame) and df.crs is not None:
        crs = df.crs
    elif crs is None:
        raise ValueError("CRS must be provided if the input DataFrame does not have a CRS set.")

    return geopandas.GeoSeries([Point(lon, lat) for lon, lat in zip(df[longitude_col], df[latitude_col])], crs=crs)
