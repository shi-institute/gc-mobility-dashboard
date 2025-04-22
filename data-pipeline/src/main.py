import os
import sys

from dotenv import load_dotenv

from etl.runner import etl_runner

load_dotenv()  # ensure .env file is loaded

if __name__ == "__main__":
    # prompt whether to run the data pipeline
    run_pipeline = input("Do you want to run the data pipeline? (Y/n): ")
    if run_pipeline.lower().startswith("conda activate"):
        os.system('clear')
        os.execv(sys.executable, ['python'] + sys.argv)
    elif run_pipeline.lower() == 'y' or run_pipeline == '':
        os.system('clear')
    else:
        print("Exiting the data pipeline.")
        exit(0)

    etl_runner()
