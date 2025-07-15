from .etl import GreenlinkRidershipETL

def source_runner():
    
    return GreenlinkRidershipETL().run()
