from etl.merge import merge_json_array_files
from etl.sources.census_acs_5year.etl import CensusACS5YearEstimatesETL
from etl.sources.census_acs_5year.tract_etl import CensusIntersectAreasETL


def source_runner():
    # get Census ACS 5-Year Estimates data
    s0101 = CensusACS5YearEstimatesETL('S0101')\
        .run()\
        .prune_tables()\
        .to_time_series()
    dp05 = CensusACS5YearEstimatesETL('DP05')\
        .run()\
        .prune_tables()\
        .to_time_series()
    s1501 = CensusACS5YearEstimatesETL('S1501')\
        .run()\
        .prune_tables()\
        .to_time_series()
    b08201 = CensusACS5YearEstimatesETL('B08201')\
        .run()\
        .prune_tables()\
        .to_time_series()

    # merge all Census ACS 5-Year Estimates data into a single time series file
    merge_json_array_files(
        json_files=[
            s0101.time_series_file_path,
            dp05.time_series_file_path,
            s1501.time_series_file_path,
            b08201.time_series_file_path
        ],
        output_file='./data/census_acs_5year/time_series.json'
    )
    
    etl = CensusIntersectAreasETL()
    etl.download_tract_geometries()
    etl.intersect_with_areas('./input/replica_interest_area_polygons', year=2020)
