import importlib
import os
import sys
from typing import Optional

# get the absolute path to the directory containing the source runners
sources_dir = os.path.join(os.path.dirname(__file__), 'sources')

# Add the sources directory to the system path
# This allows Python to find the modules within the subdirectories
sys.path.append(sources_dir)


def load_source_runners():
    """
    Dynamically imports the 'source_runner' function from each runner.py
    file in the subdirectories of src/etl/sources.

    Returns:
        a dictionary where keys are the subdirectory names and values
        are the imported 'source_runner' functions.
    """
    source_runners = {}
    after_declarations: dict[str, list[str]] = {}

    # Iterate through the subdirectories in the sources directory
    for source_name in os.listdir(sources_dir):
        source_path = os.path.join(sources_dir, source_name)

        # Check if it's a directory and contains a runner.py file
        if os.path.isdir(source_path):
            runner_file = os.path.join(source_path, 'runner.py')
            if os.path.exists(runner_file):
                try:
                    # Construct the module name relative to the added path
                    module_name = f"{source_name}.runner"
                    module = importlib.import_module(module_name)

                    # if the module has the source_runner function, load it
                    if hasattr(module, 'source_runner') and callable(module.source_runner):
                        source_runners[source_name] = module.source_runner
                    else:
                        print(
                            f"Warning: {module_name} does not have a 'source_runner' function.")

                    # if the module has the after variable, load it
                    if hasattr(module, 'after'):
                        # an after declaration is a list of source runner names that MUST run before this source runner
                        after_declarations[source_name] = module.after

                except ImportError as e:
                    print(f"Error importing module {source_name}/runner: {e}")
                    raise
                except Exception as e:
                    print(
                        f"An unexpected error occurred while processing {source_name}/runner: {e}")
                    raise

    # Remove the sources directory from the system path after importing
    sys.path.remove(sources_dir)

    # sort the source runners such that the ones with after declarations are run after their dependencies
    source_runners = dict(sorted(source_runners.items(), key=lambda item: (
        after_declarations.get(item[0], []), item[0])))

    return source_runners


def etl_runner(etls: Optional[list[str]] = None) -> None:
    """
    Run the ETL (extract, transform, and load) pipeline for each source.

    @param etls: List of ETL source names to run. If None, all sources will be run.
    """
    print("Starting ETL pipeline...")
    loaded_runners = load_source_runners()

    print("\nLoaded source runners:")
    for source_name, runner_func in loaded_runners.items():
        will_run = source_name in etls if etls else True
        print(f"- {source_name}: {runner_func} {'✓' if will_run else '✗'}")

    # run the source runners
    for source_name, runner_func in loaded_runners.items():
        will_run = source_name in etls if etls else True

        # if the source is not in the list of ETLs to run, skip it
        if not will_run:
            print(f"Skipping ETL for {source_name}...")
            continue

        # run the source runner
        print(f"\nRunning ETL for {source_name}...")
        try:
            with_restart_when_stalled(runner_func)()
        except Exception as e:
            print(f"Error running ETL for {source_name}: {e}")
            raise


def with_restart_when_stalled(func):
    """
    Decorator to restart the ETL process if it stalls for more than 8 minutes.

    Monitors the log file directory for activity. If the file has not written
    anything for 5 minutes, show a notice. If it has been another 3 minutes since
    the notice, restart the ETL process.

    The log files are expected to be in the ./data/logs directory. The most recent
    directory is monitored for activity, not a specific log file.
    """

    import multiprocessing
    import threading
    import time
    from pathlib import Path

    class ProcessManager:
        """
        A class to manage the ETL process.
        It allows starting, stopping, and checking the status of the process.
        """

        def __init__(self):
            self.process = None

        def is_alive(self):
            return self.process is not None and self.process.is_alive()

        def terminate(self):
            if self.process is not None:
                pid = self.process.pid
                print(f'◘Terminating process with PID: {pid}')
                self.process.terminate()
                self.process.join()
                self.process = None
                print(f'Process terminated (PID: ${pid}).')

        def start(self):
            if self.process:
                print('Process already exists. Try terminating it first.')

            self.process = multiprocessing.Process(target=func)
            self.process.start()

        def join(self):
            if self.process:
                self.process.join()

    def wrapper():
        log_dir = Path("./data/logs")
        if not log_dir.exists():
            print('Log directory does not exist. Cannot monitor for stalling.')
            func()
            return

        log_files = list(log_dir.glob('*.log'))
        if not log_files:
            print('No log files found in the log directory. Cannot monitor for stalling.')
            func()
            return

        log_file = max(log_files, key=lambda f: f.stat().st_mtime)

        check_interval = 60  # seconds
        inactive_threshold = 300  # 5 minutes
        restart_threshold = 180  # 3 more minutes

        pm = ProcessManager()

        restart_flag = {'value': False}

        def monitor_log():
            nonlocal restart_flag
            last_modified = log_file.stat().st_mtime
            notice_shown = False

            while True:
                time.sleep(check_interval)
                current_modified = log_file.stat().st_mtime

                if current_modified == last_modified:
                    if not notice_shown and time.time() - last_modified > inactive_threshold:
                        print(
                            f'◘No activity for {inactive_threshold}s. Will restart in {restart_threshold}s if still idle.'
                        )
                        notice_shown = True
                    elif time.time() - last_modified > inactive_threshold + restart_threshold:
                        print('Restarting ETL process due to inactivity...')
                        restart_flag['value'] = True
                        pm.terminate()  # terminate the current process so that the consumer knows it has to restart
                        break  # exit the loop to end the monitoring thread
                else:
                    last_modified = current_modified
                    notice_shown = False

        # keep starting the ETL process until it finishes normally
        while True:
            restart_flag['value'] = False
            pm.start()
            t = threading.Thread(target=monitor_log, daemon=True)
            t.start()
            pm.join()  # wait for the process to finish or be terminated

            # if the process was not restarted due to inactivity, break the loop
            if not restart_flag['value']:
                break

            # otherwise, wait a few seconds before restarting so that there
            # is enough time for the process to terminate
            time.sleep(3)

    return wrapper
