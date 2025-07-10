from typing import Optional

import geopandas
import numpy


def count_segment_frequency(trips_gdf: geopandas.GeoDataFrame, full_segments_gdf: Optional[geopandas.GeoDataFrame] = None) -> geopandas.GeoDataFrame:
    """
    Count the frequency of each segment in the trips GeoDataFrame.

    This removes the first and last segments of each trip, which are typically extremely short lines
    that indicate the start and end points of the activity, and do not represent actual network segments
    that should be counted for frequency analysis. It also assigns each segment to a bucket based on
    its frequency, where 0 represents low frequency and 10 represents the highest frequency.

    Args:
        trips_gdf (geopandas.GeoDataFrame): GeoDataFrame containing trip segments.

    Returns:
        geopandas.GeoDataFrame: A new GeoDataFrame with segment geoemtry and their frequencies.
    """
    # split each multilinestring into individual linestrings
    # and create a MultiIndex with activity_id and segment_index
    exploded = trips_gdf.set_index('activity_id').explode(index_parts=True)  # create a multiindex
    exploded.index.rename(['activity_id', 'segment_index'], inplace=True)

    # count how many segments each activity has
    activity_segment_counts = exploded.index.to_frame(index=False).groupby(
        'activity_id')['segment_index'].max() + 1

    # get the segment indices and activity ids as numpy arrays
    segment_indices = exploded.index.get_level_values('segment_index')
    activity_ids = exploded.index.get_level_values('activity_id')

    # Look up the total number of segments for each activity and subtract 1
    # This gives us the upper bound for the segment index to keep (last segment's index - 1)
    upper_bound = activity_segment_counts[activity_ids].to_numpy() - 1

    # filter to omit the first and last segments (lines) since these are
    # short lines that indicate the start and end points of the activity
    # and do not represent actual netwokr segments
    filter_condition = (segment_indices > 0) & (segment_indices < upper_bound)
    filtered_exploded = exploded[filter_condition]

    # count the frequency of each unique segment
    segment_counts = (
        filtered_exploded.groupby([filtered_exploded.geometry])
        .size()
        .reset_index(name="frequency")
    )

    # assign each segment to bucket based on its frequency (0 = low frequency, 10 = highest frequency)
    buckets_count = 10
    max_frequency = segment_counts['frequency'].max()
    segment_counts['frequency_bucket'] = numpy.minimum(
        numpy.ceil(segment_counts['frequency'] / (max_frequency // buckets_count)), buckets_count
    )

    # convert to a GeoDataFrame
    segments_gdf = fix_geometry(geopandas.GeoDataFrame(segment_counts))

    # if full_segments_gdf is available, rebase the frequency data on it
    if full_segments_gdf is not None:
        full_segments_gdf = fix_geometry(full_segments_gdf)
        shared_segments_gdf = full_segments_gdf[full_segments_gdf.geometry.isin(
            segments_gdf.geometry)]
        shared_segments_gdf = shared_segments_gdf.join(
            segments_gdf.set_index('geometry'), on='geometry', how='left')
        return shared_segments_gdf

    return segments_gdf


def fix_geometry(gdf: geopandas.GeoDataFrame) -> geopandas.GeoDataFrame:
    """
    Fix the geometry of a GeoDataFrame by making it valid.

    Args:
        gdf (geopandas.GeoDataFrame): GeoDataFrame with geometries to fix.

    Returns:
        geopandas.GeoDataFrame: GeoDataFrame with fixed geometries.
    """
    gdf.geometry = gdf.geometry.make_valid()

    # for some bizarre reason, we have to do this to convince ArcGIS that
    # the geometry is valid when using parquet files (it will fail to read the file otherwise)
    geom = gdf.geometry.to_wkb()
    gdf = geopandas.GeoDataFrame(
        gdf.drop(columns=['geometry']),
        geometry=geopandas.GeoSeries.from_wkb(geom, crs="EPSG:4326"),
    )

    return gdf
