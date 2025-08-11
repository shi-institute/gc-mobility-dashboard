from typing import Literal, cast, overload

import geopandas
import numpy
import pandas
from geographiclib.geodesic import Geodesic
from shapely import LineString, MultiPolygon, Point, Polygon, unary_union

geod: Geodesic = Geodesic.WGS84  # type: ignore


@overload
def geodesic_buffer(geom: Point, distance_meters: float, *, num_points: int = 360) -> Polygon: ...


@overload
def geodesic_buffer(geom: Polygon | MultiPolygon, distance_meters: float,
                    *, join_style: Literal['round', 'bevel'] = 'round') -> Polygon | MultiPolygon: ...


def geodesic_buffer(
    geom: Point | Polygon | MultiPolygon,
    distance_meters: float,
    *,
    num_points: int = 360,
    join_style: Literal['round', 'bevel'] = 'round'
) -> Polygon | MultiPolygon | None:
    """
    Creates a geodesic buffer around a Point, Polygon, or MultiPolygon using geographiclib.

    Args:
        point (shapely.geometry.Point | shapely.geometry.Polygon | shapely.geometry.MultiPolygon): The geometry to buffer (in WGS84).
        distance_meters (float): The buffer distance in meters.
        num_points (int): Number of points to approximate the circle.

    Returns:
        buffered (shapely.geometry.Polygon | shapely.geometry.MultiPolygon): The geodesic buffer polygon.
    """
    # draw a circle around a point
    if isinstance(geom, Point):
        circle_points = []

        for i in range(360):
            azimuth = i * (360 / num_points)
            # see https://geographiclib.sourceforge.io/html/python/code.html?highlight=direct#geographiclib.geodesic.Geodesic.Direct
            buffer_point = geod.Direct(geom.y, geom.x, azimuth, distance_meters)
            # see https://geographiclib.sourceforge.io/html/python/interface.html#dict
            circle_points.append((buffer_point["lon2"], buffer_point["lat2"]))

        return Polygon(circle_points)

    # offset each line segment of the polygon exterior by the geodesic distance
    if isinstance(geom, Polygon):
        exterior_coords = [Point(x, y) for x, y in geom.exterior.coords]
        exterior_segments = list(zip(exterior_coords[:-1], exterior_coords[1:]))
        offset_direction = 90 if geom.exterior.is_ccw else -90

        # offset exterior coordinates by the geodesic distance
        offset_exterior_line_segments: list[list[Point]] = []
        for start_point, end_point in exterior_segments:
            offset_points = geodesic_offset(
                (start_point, end_point),
                distance_meters,
                offset_direction
            )
            offset_exterior_line_segments.append(offset_points)

        offset_exterior_points: list[Point] = []

        # if we want bevel points, just let shapely  connect the line segments
        if join_style == 'bevel':
            for line_points in offset_exterior_line_segments:
                offset_exterior_points.extend(line_points)

        # otherwise, we need to add arcs between the segments
        if join_style == 'round':
            for i in range(len(offset_exterior_line_segments)):
                current_segment = offset_exterior_line_segments[i]
                next_segment = offset_exterior_line_segments[(
                    i + 1) % len(offset_exterior_line_segments)]

                start_point = current_segment[-1]
                end_point = next_segment[0]
                unbuffered_vertex = exterior_coords[(i + 1) % len(exterior_coords)]

                arc_points = geodesic_arc(start_point, end_point, unbuffered_vertex)
                offset_exterior_points.extend(current_segment)
                offset_exterior_points.extend(arc_points)

        # construct a polygon from the offset exterior points
        polygon = Polygon(offset_exterior_points)
        polygon = polygon.buffer(0)  # cleans self-intersections and removes duplicates

        return polygon

    if isinstance(geom, MultiPolygon):
        buffered_polygons = [
            geodesic_buffer(polygon, distance_meters) for polygon in geom.geoms
        ]
        result = unary_union([g for g in buffered_polygons if g is not None])
        if isinstance(result, (Polygon, MultiPolygon)):
            return result
        return None

    return None  # unsupported geometry type


def geodesic_arc(start_point: Point, end_point: Point, center_point: Point, arc_point_count: int = 8) -> list[Point]:
    """
    Creates a geodesic arc between two points around a center point.

    Args:
        start_point (shapely.geometry.Point): The starting point of the arc.
        end_point (shapely.geometry.Point): The ending point of the arc.
        center_point (shapely.geometry.Point): The center point around which the arc is drawn.
        arc_point_count (int): The number of points to generate along the arc.

    Returns:
        list[shapely.geometry.Point]: A list of points representing the arc.
    """
    # calculate the radius of the arc in meters
    radius_info = geod.Inverse(center_point.y, center_point.x, start_point.y, start_point.x)
    radius = radius_info['s12']

    # calculate the azimuths connecting the center to the start and end points
    azimuth_to_start = radius_info['azi1']
    azimuth_to_end = geod.Inverse(center_point.y, center_point.x, end_point.y, end_point.x)['azi1']

    # find the shortest sweep angle between the two azimuths
    sweep_angle = (azimuth_to_end - azimuth_to_start) % 360
    if sweep_angle > 180:
        sweep_angle -= 360

    # calculate the azimuths for each point along the arc
    arc_azimuths = numpy.linspace(
        azimuth_to_start, azimuth_to_start + sweep_angle, arc_point_count)

    # generate the points along the arc
    arc_points = []
    for azimuth in arc_azimuths:
        arc_point_info = geod.Direct(center_point.y, center_point.x, azimuth, radius)
        arc_point = Point(arc_point_info['lon2'], arc_point_info['lat2'])
        arc_points.append(arc_point)

    return arc_points


def geodesic_interpolate_points(startPoint: Point, endPoint: Point, num_points: int) -> list[Point]:
    geodesic_info = geod.Inverse(startPoint.y, startPoint.x, endPoint.y, endPoint.x)
    distance = geodesic_info['s12']
    azimuth = geodesic_info['azi1']

    # if we do not need to interpolate any points, just return the start and end points
    if num_points < 1:
        return [startPoint, endPoint]

    # calculate evently-spaced points along the geodesic line
    interpolated_points = []
    distance_between_points = distance / (num_points + 1)
    for index in range(num_points):
        distance_from_start_to_interpolated_point = distance_between_points * (index + 1)
        geodesic_info = geod.Direct(startPoint.y, startPoint.x, azimuth,
                                    distance_from_start_to_interpolated_point)
        point_lat, point_lon = geodesic_info['lat2'], geodesic_info['lon2']
        interpolated_points.append(Point(point_lon, point_lat))

    # return the start point, the interpolated points, and the end point; which represent the geodesic line
    return [startPoint] + interpolated_points + [endPoint]


@overload
def geodesic_offset(geom: tuple[Point, Point], offset_distance: float,
                    offset_azimuth: float) -> list[Point]: ...


@overload
def geodesic_offset(geom: Point, offset_distance: float, offset_azimuth: float) -> Point: ...


def geodesic_offset(geom: Point | tuple[Point, Point], offset_distance: float, offset_azimuth: float) -> Point | list[Point]:

    # if a single point is provided, we can directly offset it
    if isinstance(geom, Point):

        result = geod.Direct(geom.y, geom.x, offset_azimuth, offset_distance)
        return Point(result['lon2'], result['lat2'])

    # solve the inverse geodesic problem for the two points (the line segment)
    start_point = geom[0]
    end_point = geom[1]
    segment_geod = geod.Inverse(start_point.y, start_point.x, end_point.y, end_point.x)
    segment_distance = segment_geod['s12']
    segment_azimuth = segment_geod['azi1']

    # for long line segments, we need to interpolate points along the line
    # so that the offset remains accurate as it arcs over the earth's surface
    point_interpolation_count = int(segment_distance // 1000)  # interpolate a point for every ~1km
    line_points = geodesic_interpolate_points(start_point, end_point, point_interpolation_count)

    # offset each point along the line segment
    offset_points: list[Point] = []
    for point in line_points:
        offset_point = geodesic_offset(point, offset_distance, segment_azimuth + offset_azimuth)
        offset_points.append(offset_point)

    return offset_points


def geodesic_buffer_series(geom: geopandas.GeoSeries, distance_meters: float, num_points: int = 360) -> geopandas.GeoSeries:
    """
    Creates a geodesic buffer around a GeoSeries of Point, Polygon, or MultiPolygon
    using geographiclib.

    The input GeoSeries will be converted to WGS84 (EPSG:4326) before buffering,
    and then it will be converted back to the original CRS. If the original CRS
    is missing, it will default to EPSG:4326.

    Args:
        geom (geopandas.GeoSeries): The geometry to buffer.
        distance_meters (float): The buffer distance in meters.
        num_points (int): For Point geometry, the Number of points to approximate the circle.

    Returns:
        buffered_geoseries (geopandas.GeoSeries): The geodesic buffer polygons.
    """
    original_crs = geom.crs or 'EPSG:4326'
    geom = geom.to_crs('EPSG:4326')

    geoseries = geom.geometry
    geoseries = geoseries[geoseries.geom_type.isin(['Point', 'Polygon', 'MultiPolygon'])].copy()

    results = geom.map(lambda geom: geodesic_buffer(geom, distance_meters,
                                                    num_points=num_points) if geom is not None and geom.geom_type in ['Point', 'Polygon', 'MultiPolygon'] else None)

    return geopandas.GeoSeries(results, crs='EPSG:4326').to_crs(original_crs)


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
