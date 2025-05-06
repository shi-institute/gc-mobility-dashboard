from etl.sources.replica.etl import ReplicaETL

def source_runner():
    # get replica data
    ReplicaETL(columns=['activity_id', 'person_id', 'mode', 'travel_purpose']).run()
