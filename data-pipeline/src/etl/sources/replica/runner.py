import os
from typing import Literal, Optional

from etl.sources.replica.etl import ReplicaETL

after = ['greenlink_gtfs']


def source_runner():
    REPLICA_YEARS_FILTER = os.getenv('REPLICA_YEARS_FILTER') or None
    years: Optional[list[int]] = None
    if REPLICA_YEARS_FILTER is not None:
        years = [int(year.strip()) for year in REPLICA_YEARS_FILTER.split(',')]

    REPLICA_QUARTERS_FILTER = os.getenv('REPLICA_QUARTERS_FILTER') or None
    quarters: Optional[list[Literal['Q2', 'Q4']]] = None
    if REPLICA_QUARTERS_FILTER is not None:
        allowed_quarters = {'Q2', 'Q4'}
        quarters = [quarter.strip() for quarter in REPLICA_QUARTERS_FILTER.split(  # type: ignore
            ',') if quarter.strip() in allowed_quarters]

    # get replica data
    trip_columns = ['activity_id', 'person_id', 'mode',
                    'travel_purpose', 'tour_type', 'transit_route_ids',
                    'network_link_ids', 'vehicle_type', 'start_local_hour',
                    'end_local_hour', 'duration_minutes']
    ReplicaETL(trip_columns, years, quarters).run()
