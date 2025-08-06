import sys
import time


class TeeLogger:
    def __init__(self, logfile):
        self.terminal = sys.stdout  # store the original stdout
        self.encoding = self.terminal.encoding  # expose encoding from the original stdout

        self.log = open(logfile, "a", encoding="utf-8")  # open the log file in append mode
        self.log.write('Play back this log in your terminal.\n')
        self.log.write(f'Run `tail {logfile} -n +4`.\n\n')

    def write(self, message):
        if isinstance(message, bytes):
            message = message.decode(self.encoding or "utf-8", "replace")  # decode bytes to str

        self.terminal.write(message)  # print to terminal
        self.log.write(message)  # write to log file
        self.log.flush()  # ensure content is immediately written to the file

    def flush(self):
        self.terminal.flush()
        self.log.flush()

    def isatty(self):
        return self.terminal.isatty()  # check if the original stdout is a terminal

    def fileno(self):
        return self.terminal.fileno()  # return the file descriptor of the original stdout
