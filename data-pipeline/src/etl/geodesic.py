from typing import cast

import geopandas
import pandas
from geographiclib.geodesic import Geodesic
from shapely import LineString, Point, Polygon

geod = Geodesic.WGS84  # type: ignore


def geodesic_buffer(point: Point, distance_meters: float, num_points: int = 360) -> Polygon | None:
    """
    Creates a geodesic buffer around a Shapely Point using geographiclib.

    Args:
        point (shapely.geometry.Point): The central point (lon, lat in WGS84).
        distance_meters (float): The buffer distance in meters.
        num_points (int): Number of points to approximate the circle.

    Returns:
        shapely.geometry.Polygon: The geodesic buffer polygon.
    """
    buffer_points = []

    for i in range(num_points):
        azimuth = i * (360 / num_points)
        # see https://geographiclib.sourceforge.io/html/python/code.html?highlight=direct#geographiclib.geodesic.Geodesic.Direct
        buffer_point = geod.Direct(point.y, point.x, azimuth, distance_meters)
        # see https://geographiclib.sourceforge.io/html/python/interface.html#dict
        buffer_points.append((buffer_point['lon2'], buffer_point['lat2']))

    if buffer_points:
        return Polygon(buffer_points)
    else:
        return None


def geodesic_buffer_series(points: geopandas.GeoSeries, distance_meters: float, num_points: int = 360) -> geopandas.GeoSeries:
    """
    Creates a geodesic buffer around a GeoSeries of Shapely Points using geographiclib.

    The input GeoSeries will be converted to WGS84 (EPSG:4326) before buffering,
    and then it will be converted back to the original CRS. If the original CRS
    is missing, it will default to EPSG:4326.

    Args:
        points (geopandas.GeoSeries): The points to buffer.
        distance_meters (float): The buffer distance in meters.
        num_points (int): Number of points to approximate the circle.

    Returns:
        geopandas.GeoSeries: The geodesic buffer polygons.
    """
    original_crs = points.crs or 'EPSG:4326'
    points = points.to_crs('EPSG:4326')

    geoseries = points.geometry
    geoseries = geoseries[geoseries.geom_type.isin(['Point'])].copy()

    results = points.map(lambda point: geodesic_buffer(point, distance_meters,
                         num_points) if point is not None and point.geom_type == 'Point' else None)

    return geopandas.GeoSeries(results, crs=points.crs).to_crs(original_crs)


def geodesic_length(line: LineString) -> float:
    """
    Solves the inverse geodesic problem for the points in a shapely LineString.

    **The input geometry MUST be in WGS84 (EPSG:4326).**
    Otherwise, the results will be wrong.

    Args:
        line: (shapely.geomery.LineString): The line for which distance will be found.

    Returns:
        float: The distace of the input line in meters.
    """
    total_length_meters = 0.0

    for i in range(len(line.coords) - 1):
        startLongitude, startLatitude = line.coords[i]
        endLongitude, endLatitude = line.coords[i + 1]

        segment_geod = geod.Inverse(startLatitude, startLongitude, endLatitude, endLongitude)
        segment_distance = segment_geod['s12']
        total_length_meters += segment_distance

    return total_length_meters


def geodesic_length_series(geoseries: geopandas.GeoSeries) -> float:
    """
    Solves the inverse geodesic problem for the points in a geoseries
    of lines.

    Input geoseries should be in WGS84 (EPSG:4326). If the CRS is
    not EPSG:4326, it will be converted.

    Args:
        line: (geopandas.GeoSeries): The series of line geometries for which distance will be found.

    Returns:
        float: The distace of the input line in meters.
    """

    # if needed, convert to WGS84 (EPSG:4326)
    if geoseries.crs is None:
        raise Exception('CRS must not be missing')
    if geoseries.crs != 'EPSG:4326':
        geoseries = geoseries.to_crs('EPSG:4326')

    # extract the LineString and MultiLineString types
    lines = geoseries[geoseries.geom_type.isin(['LineString', 'MultiLineString'])].copy()

    # convert the MultiLineString types to LineString types
    lines = lines.explode(index_parts=False)
    lines = lines[lines.geom_type == 'LineString']  # only keep LineString types

    if lines.empty:
        return 0.0

    # get the sum of distances for each LineString
    total_distance = lines\
        .map(lambda line: geodesic_length(cast(LineString, line)))\
        .sum()

    return float(total_distance)


def geodesic_area(polygon: Polygon) -> tuple[float, float]:
    """
    Calculates the geodesic area of a polygon using geographiclib.

    **The input geometry MUST be in WGS84 (EPSG:4326).**
    Otherwise, the results will be wrong.

    Args:
        polygon (shapely.geometry.Polygon): The polygon for which area will be found.

    Returns:
        tuple[float, float]: A tuple containing the perimeter and area of the polygon in meters and square meters, respectively.

    """
    if not polygon.is_valid:
        raise ValueError("Invalid polygon geometry")

    # construct a geodesic polygon from the shapely polygon points
    geodesic_polygon = geod.Polygon()
    for longitude, latitude in polygon.exterior.coords:
        geodesic_polygon.AddPoint(latitude, longitude)

    # compute the properties of the geodesic polygon
    number, perimeter, area = geodesic_polygon.Compute()

    return (perimeter, area)


def geodesic_area_series(geoseries: geopandas.GeoSeries) -> tuple[float, float]:
    """
    Calculates the geodesic area of a GeoSeries of polygons using geographiclib.

    The input GeoSeries will be converted to WGS84 (EPSG:4326) before calculating the area,
    and then it will be converted back to the original CRS. If the original CRS
    is missing, it will default to EPSG:4326.

    Args:
        polygons (geopandas.GeoSeries): The polygons for which area will be found.

    Returns:
        tuple[float, float]: A tuple containing the total perimeter and area of the polygons in meters and square meters, respectively.
    """
    # if needed, convert to WGS84 (EPSG:4326)
    if geoseries.crs is None:
        raise Exception('CRS must not be missing')
    if geoseries.crs != 'EPSG:4326':
        geoseries = geoseries.to_crs('EPSG:4326')

    # extract the Polygon and MultiPolygon types
    polygons = geoseries[geoseries.geom_type.isin(['Polygon', 'MultiPolygon'])].copy()

    # convert the MultiPolygon types to LinePolygonString types
    polygons = polygons.explode(index_parts=False)
    polygons = polygons[polygons.geom_type == 'Polygon']  # only keep Polygon types

    if polygons.empty:
        return (0.0, 0.0)

    # get the perimeters and areas for each Polygon
    results = polygons.apply(lambda polygon: geodesic_area(cast(Polygon, polygon)))
    results_df = pandas.DataFrame(results.tolist(), columns=['perimeter', 'area'])
    results_df['area'] = results_df['area'].abs()  # ensure area is positive

    # sum the results
    total_perimeter = results_df['perimeter'].sum().astype(float)
    total_area = results_df['area'].sum().astype(float)

    return (total_perimeter, total_area)
