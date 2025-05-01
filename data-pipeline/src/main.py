import os
import sys

from dotenv import load_dotenv

from etl.runner import etl_runner

if __name__ == "__main__":
    # check if the script is running in docker
    docker = False
    if os.path.exists('/.dockerenv'):
        docker = True

    # if not running in docker, load the .env file
    if not docker:
        load_dotenv()

    # if not running in docker, prompt whether to run the data pipeline
    if not docker:
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
    print('DONE')
