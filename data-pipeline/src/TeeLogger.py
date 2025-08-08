import sys


class TeeLogger:
    last_message_was_omitted = False

    def __init__(self, logfile):
        self.terminal = sys.stdout  # store the original stdout
        self.encoding = self.terminal.encoding  # expose encoding from the original stdout

        self.log = open(logfile, "a", encoding="utf-8")  # open the log file in append mode
        self.log.write('Play back this log in your terminal.\n')
        self.log.write(f'Run `tail {logfile} -n +4`.\n\n')

    def write(self, message):
        if isinstance(message, bytes):
            message = message.decode(self.encoding or "utf-8", "replace")  # decode bytes to str

        # messages that start with ◘ are not written to the log file
        if message.startswith('◘'):
            message = message[1:]
            self.terminal.write(message)
            self.last_message_was_omitted = True
            return

        # print() will also send \n, so we need to also not write it to the log file
        # if the last message was omitted
        if self.last_message_was_omitted and message == "\n":
            self.terminal.write(message)
            self.last_message_was_omitted = False
            return

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
