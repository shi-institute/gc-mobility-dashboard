import gc
from typing import cast

import dask_geopandas
import geopandas
import pandas
from shapely.geometry.base import BaseGeometry
from tqdm import tqdm


def partitions_to_gdf(partitions_path: str, filter_geo_union: BaseGeometry, chunk_size: int = 4, indent: int = 0) -> geopandas.GeoDataFrame:
    """
    Convert Dask partitions to a GeoDataFrame, filtering by a given GeoDataFrame.

    Args:
        partitions_path (str): Path to the Dask partitions.
        filter_geo_union (shapely.geometry.base.BaseGeometry): A unary union geometry.
        chunk_size (int): Number of partitions to process at once. Larger values increase memory usage but may speed up processing. Default is 4.

    Returns:
        geopandas.GeoDataFrame: Filtered GeoDataFrame containing the data from the partitions.
    """
    indentation = ' ' * indent

    partitioned_dgdf = cast(dask_geopandas.GeoDataFrame,
                            dask_geopandas.read_parquet(partitions_path))

    gdfs: list[geopandas.GeoDataFrame] = []

    bar = tqdm(total=partitioned_dgdf.npartitions,
               desc=f'{indentation}Processing partitions', unit='partition')
    for i in range(0, partitioned_dgdf.npartitions, chunk_size):
        # select a slice of partitions
        start = i
        end = min(i + chunk_size, partitioned_dgdf.npartitions)
        partitions_slice = partitioned_dgdf.partitions[start:end]

        # filter the current chunk
        filtered_chunks_gdf = partitions_slice[partitions_slice.intersects(
            filter_geo_union)].compute()

        gdfs.append(filtered_chunks_gdf)
        bar.update(chunk_size)

    bar.close()

    # merge all filtered GeoDataFrames into one
    if gdfs:
        merged_gdf = geopandas.GeoDataFrame(pandas.concat(gdfs, ignore_index=True))
        bar.write(
            f'{indentation}Merged GeoDataFrame has {merged_gdf.shape[0]} rows and {merged_gdf.shape[1]} columns.')
    else:
        merged_gdf = geopandas.GeoDataFrame()

    del gdfs
    gc.collect()

    return merged_gdf
