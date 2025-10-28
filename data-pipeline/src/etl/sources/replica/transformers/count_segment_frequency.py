import gc
import logging
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Generator, Optional

import dask.dataframe
import geopandas
import numpy
import pandas

logger = logging.getLogger('count_segment_frequency')
logger.setLevel(logging.DEBUG)


def count_segment_frequency(trips_gdf: geopandas.GeoDataFrame, full_segments_gdf: Optional[geopandas.GeoDataFrame] = None, *, log_space: str = '',) -> geopandas.GeoDataFrame:
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
    logger.debug(f'{log_space}Exploding trips GeoDataFrame to count segment frequencies...')
    exploded = trips_gdf.set_index('activity_id').explode(index_parts=True)  # create a multiindex
    exploded.index.rename(['activity_id', 'segment_index'], inplace=True)

    # count how many segments each activity has
    logger.debug(f'{log_space}Counting segments per activity...')
    activity_segment_counts = exploded.index.to_frame(index=False).groupby(
        'activity_id')['segment_index'].max() + 1

    logger.debug(f'{log_space}Building filter...')

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
    logger.debug(f'{log_space}Counting segment frequencies...')
    segment_counts = (
        filtered_exploded.groupby([filtered_exploded.geometry])
        .size()
        .reset_index(name="frequency")
    )

    # assign each segment to bucket based on its frequency (0 = low frequency, 10 = highest frequency)
    logger.debug(f'{log_space}Assigning frequency buckets...')
    buckets_count = 10
    max_frequency = segment_counts['frequency'].max()
    segment_counts['frequency_bucket'] = numpy.minimum(
        numpy.ceil(segment_counts['frequency'] / (max_frequency // buckets_count)), buckets_count
    )

    # convert to a GeoDataFrame
    logger.debug(f'{log_space}Converting segment counts to GeoDataFrame with fixed geometry...')
    segments_gdf = fix_geometry(geopandas.GeoDataFrame(segment_counts))

    # if full_segments_gdf is available, rebase the frequency data on it
    if full_segments_gdf is not None:
        logger.debug(f'{log_space}Rebasing segment frequencies on full segments GeoDataFrame...')
        full_segments_gdf = fix_geometry(full_segments_gdf)
        shared_segments_gdf = full_segments_gdf[full_segments_gdf.geometry.isin(
            segments_gdf.geometry)]
        shared_segments_gdf = shared_segments_gdf.join(
            segments_gdf.set_index('geometry'), on='geometry', how='left')
        return shared_segments_gdf

    return segments_gdf


def explode_and_hash(gdf: geopandas.GeoDataFrame, multiindex_column: str = 'activity_id', index_start: int = 0, *, log_space: str = '',) -> geopandas.GeoDataFrame:
    """
    Explode a GeoDataFrame with MultiIndex and hash the index to create a unique identifier.

    Args:
        gdf (geopandas.GeoDataFrame): GeoDataFrame to explode and hash.
        multiindex_column (str): The column to use for MultiIndex.

    Returns:
        geopandas.GeoDataFrame: A new GeoDataFrame with exploded segments and hashed index.
    """
    # split each multilinestring into individual linestrings
    # and create a MultiIndex with activity_id and segment_index
    logger.debug(f'{log_space}Exploding trips GeoDataFrame to count segment frequencies...')
    exploded = gdf.set_index(multiindex_column).explode(index_parts=True)  # create a multiindex
    exploded.index.rename(['activity_id', 'segment_index'], inplace=True)

    # count how many segments each activity has
    logger.debug(f'{log_space}Counting segments per activity...')
    activity_segment_counts = exploded.index.to_frame(index=False).groupby(
        'activity_id')['segment_index'].max() + 1

    logger.debug(f'{log_space}Building filter...')

    # get the segment indices and activity ids as numpy arrays
    segment_indices = exploded.index.get_level_values('segment_index')
    activity_ids = exploded.index.get_level_values('activity_id')

    # Look up the total number of segments for each activity and subtract 1
    # This gives us the upper bound for the segment index to keep (last segment's index - 1)
    upper_bound = activity_segment_counts[activity_ids].to_numpy() - 1

    # filter to omit the first and last segments (lines) since these are
    # short lines that indicate the start and end points of the activity
    # and do not represent actual network segments
    filter_condition = (segment_indices > 0) & (segment_indices < upper_bound)
    filtered_exploded = exploded[filter_condition].copy().sort_index()
    del exploded
    gc.collect()

    # create a hash for each segment's geometry
    logger.debug(f'{log_space}Hashing segment geometries...')
    filtered_exploded.loc[:, 'geometry_hash'] = filtered_exploded.geometry.apply(
        lambda geom: hash(geom.wkb) if geom is not None else None
    )

    result = filtered_exploded.reset_index(
        drop=True  # reset index to avoid multiindex in the final GeoDataFrame
    )
    result.index = pandas.Index(result.index + index_start)  # start index from the specified value
    return result


def count_frequency(df: pandas.DataFrame, freq_column: str = 'geometry_hash', *, log_space: str = '',) -> pandas.DataFrame:
    """
    Count the frequency of each unique value in a specified column of a DataFrame.

    This function groups the DataFrame by the specified column, counts the occurrences of each unique value,
    and assigns a frequency bucket based on the maximum frequency found. The frequency buckets range from
    0 (low frequency) to 10 (highest frequency).

    The added columns are:
        - 'frequency': The count of occurrences for each unique value.
        - 'frequency_bucket': A bucketed representation of the frequency, where 0 is low frequency
          and 10 is the highest frequency.
        - 'first_occurrence_index': The index of the first occurrence of each unique value.

    Args:
        df (pandas.DataFrame): DataFrame containing the data.
        freq_column (str): The column for which occurences should be counted.

    Returns:
        pandas.DataFrame: A DataFrame with unique values and their frequencies.
    """
    # count frequency and get the first index for each unique segment
    logger.debug(f'{log_space}Counting segment frequencies...')
    segment_counts = df.groupby(freq_column).agg(
        frequency=(freq_column, 'size'),
        first_occurrence_index=(freq_column, lambda x: x.index[0])
    ).reset_index()

    # assign each segment to bucket based on its frequency (0 = low frequency, 10 = highest frequency)
    logger.debug(f'{log_space}Assigning frequency buckets...')
    buckets_count = 10
    max_frequency = segment_counts['frequency'].max()
    segment_counts['frequency_bucket'] = numpy.minimum(
        numpy.ceil(segment_counts['frequency'] / (max_frequency // buckets_count)), buckets_count
    )

    return segment_counts


def count_segment_frequency_multi_input(
    input_file_paths: list[Path],
    output_file_path: str,
    *,
    intermediate_chunks_folder: str | None = None,
    step1_columns: Optional[list[str]] = None,
    skip_step_1: bool = False,
    step_2_filter: Optional[list[tuple[str, str, Any]] | list[list[tuple[str, str, Any]]]] = None,
    out_crs: str = 'EPSG:4326',
    log_space: str = '',
    success_hash: Optional[str] = None,
) -> Generator[tuple[int, int], None, None]:
    """
    Counts the frequency of segments across multiple input files, links them to their frequencies, and saves the result.

    This function processes geographic data from multiple input files, identifies unique segments, counts their occurrences,
    and saves the segments along with their frequencies to an output file. It is designed to handle large datasets by
    processing data in chunks and using temporary files for intermediate results.

    Args:
        input_file_paths (list[Path]): A list of paths to the input files. These files can be either GeoJSON or Parquet
            and should contain geographic data, specifically trip geometries.
        output_file_path (str): The path to the output file. The output file may be a parquet file or any single-layer
            file that is supported by GeoPandas for writing in append mode. It will contain the segment geometries
            and their frequencies. If the file already exists, it will be overwritten.
        intermediate_chunks_folder (str | None, optional):  Path to a folder to store intermediate chunk files. If None, a
            temporary directory will be created and used.  Defaults to None.
        step1_columns (Optional[list[str]], optional): List of columns to read from the input files in the first step
            (Exploding and hashing).  If None, all columns are read. Defaults to None.
        skip_step_1 (bool, optional): If True, skips the first step (Exploding and hashing) and assumes that the
            intermediate chunk files already exist in the `intermediate_chunks_folder`. Defaults to False.
        step_2_filter (Optional[list[tuple[str, str, Any]] | list[list[tuple[str, str, Any]]]], optional): Filters to apply
            when reading the intermediate chunk files in the second step (Counting segment frequencies). This can be a list
            of filters or a list of lists of filters, compatible with dask's filter syntax. Defaults to None.
        out_crs (str, optional): The coordinate reference system (CRS) to convert the segment geometries to.
            Defaults to 'EPSG:4326'.
        log_space (str, optional): A string to prepend to log messages. Defaults to ''.
        success_hash (Optional[str], optional): If provided, a success file will be created for each chunk with the
            hash in the name. This can be used to track successful processing of chunks. Defaults to None.

    Yields:
        Generator[tuple[int, int], None, None]: Yields tuples of the current step and total steps for progress tracking.
            The first element is the current step (0-indexed), and the second element is the total number of steps.

    Raises:
        FileNotFoundError: If any of the input files specified in `input_file_paths` do not exist.
        ValueError: If the input file format is not supported (only GeoJSON and Parquet are supported).
        Exception: If any error occurs during file reading, processing, or writing.

    Notes:
        - The function uses temporary files to store intermediate results, especially segment hashes and frequencies.
        - The `intermediate_chunks_folder` can be specified to avoid recomputing the segment hashes if the process is
          interrupted or needs to be rerun with different parameters. For example, if you run with the same input files
          but different filters, you can reuse the intermediate chunks. Remember to specify `skip_step_1=True` for
          subsequent runs to skip the explosion and hashing step (the slowest part).
        - The function is designed to be memory-efficient by processing data in chunks and using Dask for parallel
          computation.
    """
    total_steps = len(input_file_paths) * (1 if skip_step_1 else 2) + \
        1  # explosion + linking and saving + counting
    current_step = 0
    yield (0, total_steps)

    # create a temporary folder for intermediate output
    should_clean_temp_folder = False
    if intermediate_chunks_folder is None:
        should_clean_temp_folder = True
        temporary_chunks_folder = tempfile.TemporaryDirectory(prefix='segment_hash_chunks_').name
    else:
        temporary_chunks_folder = intermediate_chunks_folder

    # Part 1. Explode the trip geometry into segments and generate hashes for each segment geometry
    if not skip_step_1:
        logger.info(f'{log_space}Exploding trip geometries and generating hashes...')
        last_max_row_index = -1  # track so that we can ensure index is unique across all files
        for file_index, file_path in enumerate(input_file_paths):
            current_step += 1

            logger.debug(f'{log_space}  Reading file: {file_path}')
            if file_path.as_posix().endswith('.parquet'):
                gdf = geopandas.read_parquet(
                    file_path,
                    columns=step1_columns
                )
            else:
                gdf = geopandas.read_file(file_path)

            logger.debug(f'{log_space}  Exploding and hashing...')
            result = explode_and_hash(
                gdf, 'activity_id', last_max_row_index + 1, log_space=f'{log_space}    ')
            last_max_row_index = result.index.max()

            logger.debug(f'{log_space}  Saving chunk...')
            chunk_file_path = f'{temporary_chunks_folder}/chunk_{file_index}.parquet'
            result.to_parquet(chunk_file_path, index=True)

            # if there is a success_hash, create a .success file with the hash in the name
            if success_hash:
                success_file_path = chunk_file_path.replace(
                    '.parquet', f'__{success_hash}.success')
                with open(success_file_path, 'w') as success_file:
                    success_file.write('')

            del result
            gc.collect()

            # yield the step that was just completed so the consumer can show and update progress
            yield (current_step, total_steps)

    # Part 2. Read the segment geometry hashes and find the frequency of each hash
    current_step += 1
    logger.info(f'{log_space}Counting segment frequencies...')
    logger.debug(f'{log_space}  Reading all segment hashes...')
    logger.debug(f'{log_space}    Temporary chunks folder: {temporary_chunks_folder}')
    segment_hashes_df = dask.dataframe.read_parquet(  # use dask instead of pandas because it ignores the success files
        temporary_chunks_folder,
        columns=['geometry_hash'],
        engine='pyarrow',
        filters=[step_2_filter] if step_2_filter is not None else None,
    ).compute()
    logger.debug(f'{log_space}  Counting frequencies...')
    segment_hash_frequencies = count_frequency(
        segment_hashes_df, 'geometry_hash', log_space=f'{log_space}    ')

    yield (current_step, total_steps)

    # Part 3. Look through each chunk and join the segment hashes with the associated partition
    logger.info(f'{log_space}Linking segment geometries with their frequencies and saving...')
    for chunk_index, chunk_path in enumerate(Path(temporary_chunks_folder).glob('*.parquet')):
        current_step += 1

        logger.debug(f'{log_space}  Reading chunk: {chunk_path}')
        chunk_gdf = geopandas.read_parquet(
            chunk_path,
            columns=['geometry', 'geometry_hash'],
            filters=[step_2_filter] if step_2_filter is not None else None,
        ).to_crs(out_crs)

        logger.debug(f'{log_space}  Joining with segment frequencies...')
        chunk_gdf = chunk_gdf.merge(
            segment_hash_frequencies,
            left_index=True,
            right_on='first_occurrence_index',
            how='left',
        ).set_index('first_occurrence_index')
        chunk_gdf.index.name = None

        # drop all columns except frequency and frequency_bucket
        chunk_gdf = chunk_gdf[['frequency', 'frequency_bucket', 'geometry']]

        # ignore rows without an occurence
        chunk_gdf = chunk_gdf[chunk_gdf['frequency'] > 0]

        # save to the outpit file path in append mode
        logger.debug(f'{log_space}  Saving chunk {chunk_index} to output file: {output_file_path}')
        if output_file_path.endswith('.parquet'):
            if chunk_index == 0:
                chunk_gdf.to_parquet(output_file_path, engine='pyarrow')
            else:
                chunk_gdf.to_parquet(output_file_path, engine='pyarrow', append=True)
        else:
            # write to the output file, appending to the same file each interation of the loop
            chunk_gdf\
                .to_crs(out_crs)\
                .to_file(output_file_path, mode='w' if chunk_index == 0 else 'a')

        yield (current_step, total_steps)

    # clean up the temporary folder
    if should_clean_temp_folder:
        logger.debug(f'{log_space}Cleaning up temporary chunks folder: {temporary_chunks_folder}')
        shutil.rmtree(temporary_chunks_folder, ignore_errors=True)


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
