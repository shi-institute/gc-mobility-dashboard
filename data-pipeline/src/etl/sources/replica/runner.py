import os
from typing import Optional

from etl.sources.replica.etl import ReplicaETL


def source_runner():
    REPLICA_YEARS_FILTER = os.getenv('REPLICA_YEARS_FILTER') or None
    years: Optional[list[int]] = None
    if REPLICA_YEARS_FILTER is not None:
        years = [int(year.strip()) for year in REPLICA_YEARS_FILTER.split(',')]

    REPLICA_QUARTERS_FILTER = os.getenv('REPLICA_QUARTERS_FILTER') or None
    quarters: Optional[list[str]] = None
    if REPLICA_QUARTERS_FILTER is not None:
        quarters = [quarter.strip()
                    for quarter in REPLICA_QUARTERS_FILTER.split(',')]

    # get replica data
    ReplicaETL(['activity_id', 'person_id', 'mode',
            'travel_purpose', 'tour_type', 'transit_route_ids', 'network_link_ids', 'vehicle_type'], years, quarters).run()
