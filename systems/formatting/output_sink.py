import os.path
import time
import json
from queue import Queue

from openpyxl.styles.builtins import output


class OutputSink:
    def __init__(self, path):
        self.output_path = f'{path}\\formatted_output.json'
        self.q = Queue()
        self.run = False

    def enqueue(self, item):
        self.q.put(item)

    def dequeue(self):
        return self.q.get()

    def is_empty(self):
        return self.q.empty()

    def stop_output_sink(self):
        self.run = False

    def start(self):
        self.run = True
        print("Output Sink: Starting Output sink.")
        while self.run:
            if not self.is_empty():
                item = self.dequeue()
                self.process_item(item)
            else:
                time.sleep(1)
        print("Output Sink: Exiting output sink.")

    def stop(self):
        self.run = False


    def process_item(self, item):
        entity_type, data = item
        if os.path.exists(self.output_path):
            with open(self.output_path, 'r') as file:
                try:
                    file_data = json.load(file)
                except json.JSONDecodeError:
                    file_data = []

        else:
            file_data = []

        file_data.append(data)

        with open(self.output_path, "w") as file:
            json.dump(file_data, file, indent=4)


