import time
import os
import pandas as pd
from queue import Queue
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class DataObject:
    def __init__(self, **kwargs):
        filename = None
        for key, value in kwargs.items():
            if not pd.isna(value):
                if isinstance(value, int):
                    continue
                if len(value.split("::")) > 2:
                    split_value = value.split("::")
                    data, filename, header = split_value
                    setattr(self, header, data)
        if filename is not None:
            setattr(self, 'filename', filename)


    def is_empty(self):
        if all(value is None for value in vars(self).values()):
            return True

class InputSink:
    def __init__(self):
        self.q = Queue()

    def enqueue(self, item):
        self.q.put(item)

    def dequeue(self):
        return self.q.get()

    def is_empty(self):
        return self.q.empty()

class FileMonitor:

    def __init__(self, file_path):
        self.file_path = file_path
        self.input_sink = InputSink()
        self.directory, self.filename = os.path.split(file_path)
        self.observer = Observer()
        self.run = True

    def start_monitor(self):
        event_handler = FileHandler(self.file_path ,self.filename, self.input_sink)
        self.observer = Observer()
        self.observer.schedule(event_handler, path=self.directory, recursive=False)
        self.observer.start()
        print("File Monitor: Watching xls file...")
        try:
            while self.run:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop_monitor()
            self.observer.stop()
        finally:
            print("File Monitor: Stopping file monitor...")
            self.observer.stop()
            self.observer.join()

    def stop_monitor(self):
        self.run = False

class FileHandler(FileSystemEventHandler):

    def __init__(self, file_path, filename, input_sink):
        self.file_path = file_path
        self.filename = filename
        self.reset_cursor()
        self.cursor = load_cursor()
        self.input_sink = input_sink
        self.modified_time = 0

        if is_file_ready(self.file_path):
            self.file_size = os.path.getsize(self.file_path)
        else:
            self.file_size = 0


    def on_modified(self, event):
        filename = event.src_path.split("\\")[-1]
        current_time = time.time()
        if filename == self.filename and current_time - self.modified_time > 1:
            self.modified_time = current_time
            new_file_size = os.path.getsize(self.file_path)
            for _ in range(3):
                if new_file_size != self.file_size and new_file_size > 0 and is_file_ready(self.file_path):
                    print(f'File {self.filename} was modified')
                    self.modified_time = current_time
                    self.file_size = new_file_size
                    self.read_file()
                new_file_size = os.path.getsize(self.file_path)
                time.sleep(0.5)

    def read_file(self):
        while True:
            try:
                df = pd.read_excel(self.file_path, skiprows=range(1, self.cursor + 1))
                if not df.empty:
                    self.cursor = df.index[-1] + 1
                    self.save_cursor()
                    print(f'Successfully read from excel file')
                    self.parse_rows(df)
                    del df
                    break
                else:
                    break
            except Exception as e:
                time.sleep(1)

    def parse_rows(self, df):
        print("Parsing rows...")
        for row in df.itertuples(index=True):
            row_data = row[1:]
            obj = DataObject(**dict(zip(df.columns.astype(str)[1:], row_data)))
            if not obj.is_empty():
                self.input_sink.enqueue(obj)
        print("Finished parsing rows...")

    def save_cursor(self):
        with open("cursor.txt", "w") as file:
            file.write(str(self.cursor))

    def reset_cursor(self):
        self.cursor = 0
        self.save_cursor()

def load_cursor():
    try:
        with open("cursor.txt", "r") as file:
            return int(file.read().strip())
    except FileNotFoundError:
        return 0

def is_file_ready(file_path):
    try:
        with open(file_path, 'rb') as file:
            file.read()
            return True
    except IOError:
        return False







