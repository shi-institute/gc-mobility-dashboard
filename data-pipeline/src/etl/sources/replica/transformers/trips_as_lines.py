import gc
import logging
from datetime import datetime
from logging import getLogger
from typing import Optional

import geopandas
import pandas
from shapely.geometry import LineString, MultiLineString
from tqdm import tqdm

logger = getLogger('replica')
logger.setLevel(logging.INFO)


def create_network_segments_lookup(network_segments_gdf: geopandas.GeoDataFrame) -> dict[str, LineString]:
    """
    Create a lookup dictionary for network segments from a GeoDataFrame.

    Args:
        network_segments_gdf (geopandas.GeoDataFrame): GeoDataFrame containing network segments.

    Returns:
        dict[str, LineString]: Dictionary mapping stableEdgeId to LineString geometry.
    """
    logger.info('Creating segment WKT lookup dictionary...')
    start_time = datetime.now()
    segment_lookup: dict[str, LineString] = network_segments_gdf.set_index("stableEdgeId")[
        "geometry"].to_dict()
    elapsed_time = datetime.now() - start_time
    logger.info(
        f'Created segment WKT lookup dictionary with {len(segment_lookup)} entries in {elapsed_time} seconds.')
    return segment_lookup


def trips_as_lines(trips_df: pandas.DataFrame, network_segments_lookup: dict[str, LineString] | geopandas.GeoDataFrame, crs: str = 'EPSG:4326', bar: Optional[tqdm] = None) -> geopandas.GeoDataFrame:
    """
    Convert trips to lines by joining trip points with network segments.

    The start and end points of each trip are included as very short linestrings
    to ensure the geometry includes the trip start and end points, even if the network segments
    cannot be fully matched. If any network link IDs are missing, they are recorded in a
    `missing_network_link_ids` column as a comma-separated string. If all network link IDs
    are found, this column will be `None`.

    The start and end coordinates must exist as the following columns in the input trip GeoDataFrame:
    - `start_lng`
    - `start_lat`
    - `end_lng`
    - `end_lat`

    Args:
        trips_df (pandas.DataFrame): DataFrame containing trips.
        network_segments_lookup ( dict[str, LineString] | geopandas.GeoDataFrame): A dict of key-value pairs where the key is the entwork segment id and the value is a LineString OR a GeoDataFrame containing network segments. If providing a dict, ensure the LineString geometries are in the same coordinate reference system (CRS) as the trips_df
        crs (str): Coordinate reference system of the input trips_df data. Defaults to 'EPSG:4326' If network_segments_lookup is a GeoDataFrame and has a different crs, it will be converted.

    Returns:
        geopandas.GeoDataFrame: GeoDataFrame with trips as lines.
    """

    # if the consumer of this function does not provide a progress bar, create one
    should_close_bar_when_done = False
    if bar is None:
        bar = tqdm(total=len(trips_df), desc='Processing trips', unit='trip')
        should_close_bar_when_done = True

    if 'geometry' in trips_df.columns:
        logger.warning(
            "The 'geometry' column already exists in the trips DataFrame. It will be replaced with the new geometry.")

    if isinstance(network_segments_lookup, geopandas.GeoDataFrame):
        # if the network segments GeoDataFrame has a different CRS than the trips DataFrame, convert it
        if network_segments_lookup.crs != crs:
            logger.info(
                f'Converting network segments GeoDataFrame from {network_segments_lookup.crs} to {crs}...')
            network_segments_lookup = network_segments_lookup.to_crs(crs)

        # convert to a dictionary for faster lookups of network segments
        network_segments_lookup = create_network_segments_lookup(network_segments_lookup)

    def get_matching_segments(row: pandas.Series) -> tuple[bytes | None, str | None]:
        trip_id = row['activity_id']
        if not isinstance(trip_id, str):
            logger.warning(
                f"Trip ID {trip_id} is not a string. Skipping trip.")
            return (None, None)

        link_ids: list[str] = [link_id.strip()
                               for link_id in row['network_link_ids'].split(',') if link_id.strip() != '']

        origin_lng = row["start_lng"]
        origin_lat = row["start_lat"]
        dest_lng = row["end_lng"]
        dest_lat = row["end_lat"]
        if not (isinstance(origin_lng, (float, int)) and isinstance(origin_lat, (float, int)) and isinstance(dest_lng, (float, int)) and isinstance(dest_lat, (float, int))):
            logger.warning(
                f"Trip {trip_id} has missing start or end coordinates or the coordinate values are invalud. Skipping trip.")
            return (None, None)

        # retrieve segments using the lookup dictionary
        ordered_segments = [
            network_segments_lookup.get(link_id) for link_id in link_ids
        ]

        # filter out None values in case a link_id is not found
        found_segments = [
            seg for seg in ordered_segments if seg is not None
        ]

        # create missing links
        missing_links = None
        if len(found_segments) != len(link_ids):
            missing_links = set(link_ids) - set(
                [
                    link_id
                    for link_id, seg in zip(link_ids, ordered_segments)
                    if seg is not None
                ]
            )
            for link_id in missing_links:
                logger.debug(
                    f"Link ID {link_id} from trip {trip_id} not found in network segments."
                )

        # convert missing_links to a csv to reduce memory usage
        missing_links_str = None
        if missing_links:
            missing_links_str = ','.join(missing_links)
        del missing_links  # free up memory

        # insert the start and end points of the trip as the first and last segments
        # as really short linestrings so that the geometry includes the trip start and end points
        # in case the netwokr segments cannot be fully matched
        epsilon = 1e-9  # 0.000000001
        origin_line = LineString([
            [origin_lng, origin_lat],
            [origin_lng + epsilon, origin_lat + epsilon]
        ])
        dest_line = LineString([
            [dest_lng + epsilon, dest_lat + epsilon],
            [dest_lng, dest_lat]
        ])
        found_segments = [origin_line] + found_segments + [dest_line]

        # convert the segments to well-known binary (WKB) byte representation of MultiLineString
        found_segments_wkb = None
        if found_segments:
            # converting to bytes instead of keeping as a shapely MultiLineString is slower but way less memory intensive
            found_segments_wkb = MultiLineString(found_segments).wkb

        # increment the progress bar
        bar.update(1)

        # convert the ordered segments into a multilinestring indicating the line geometries as a single multilinestring
        if found_segments:
            return (found_segments_wkb, missing_links_str)

        return (None, missing_links_str)

    logger.info(f'Finding matching segments for {len(trips_df)} trips...')

    # Apply the function to each row and unpack the results into new columns
    # expand: create a new DataFrame with the results for each row
    apply_results = trips_df.apply(
        get_matching_segments, axis=1, result_type='expand')
    geometry_wkb: pandas.Series[bytes | None] = apply_results[0]  # type: ignore
    missing_network_link_ids: pandas.Series[str | None] = apply_results[1]  # type: ignore

    # assign the resultant multilinestring geometry
    # create a GeoDatFrame from the trips DataFrame and the network segments geometry
    logger.info('Creating GeoDataFrame with route segment geometries...')
    geometry = geopandas.GeoSeries.from_wkb(geometry_wkb, crs=crs)
    gdf = geopandas.GeoDataFrame(trips_df, geometry=geometry)

    # keep track of the missing network link ids, which are returned as csv (when any are misisng) or None (when all are found)
    gdf['missing_network_link_ids'] = missing_network_link_ids

    # force memory cleanup
    del apply_results
    del geometry_wkb
    del missing_network_link_ids
    gc.collect()

    # if the bar was created in this function, close it
    if should_close_bar_when_done:
        bar.close()

    # filter out null geometries before returning the new GeoDataFrame
    return gdf
