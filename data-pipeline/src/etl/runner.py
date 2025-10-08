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
        print(f"\033[32m\nRunning ETL for {source_name}...\033[0m")
        try:
            with_restart_when_stalled(runner_func)()
        except Exception as e:
            print(f"\033[31mError running ETL for {source_name}: {e}\033[0m")
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
    import traceback
    from pathlib import Path

    class ProcessManager:
        """
        A class to manage the ETL process.
        It allows starting, stopping, and checking the status of the process.
        """

        def __init__(self):
            self.process = None
            self.attempts = 0

        def is_alive(self):
            return self.process is not None and self.process.is_alive()

        def terminate(self, indent: int = 0) -> None:
            if self.process is not None:
                pid = self.process.pid
                print(f'{' ' * indent}◘Terminating process with PID: {pid}')
                self.process.terminate()
                self.process.join()
                self.process = None
                print(f'{' ' * indent}Process terminated (PID: ${pid}).')

        def start(self):
            if self.process:
                print('Process already exists. Try terminating it first.')

            self.process = multiprocessing.Process(target=func)
            self.process.start()

        def join(self):
            """Starts the process and waits for it to finish. If the process
            exits with a non-zero exit code, it is restarted (up to 5 times).

            Raises:
                RuntimeError: If the process exits with a non-zero exit code
                after 5 attempts.
            """
            while self.attempts < 5:
                if self.process:
                    self.attempts += 1
                    self.process.join()

                    # if the process exited successfully, break the loop
                    if self.process.exitcode == 0:
                        break

                    # the process failed with an error; try it again (up to 5 times)
                    print(f'\033[31m\n\nProcess exited with code {self.process.exitcode}.\033[0m')
                    if self.attempts < 5:
                        print(f'\033[33m  Terminating...\033[0m')
                        time.sleep(1)
                        self.terminate(indent=4)
                        print(
                            f'\033[33m  Re-trying process (attempt {self.attempts + 1}/5)...\033[0m')
                        print()
                        time.sleep(1)
                        self.start()
                    else:
                        print('\033[41m\033[37mMaximum attempts reached. Not restarting.\033[0m')
                        raise RuntimeError(
                            f'Process exited with non-zero exit code: {self.process.exitcode}.')

                else:
                    print('No process to join.')
                    break

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
