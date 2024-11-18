import ast
import time
import json
import threading
from entities.person import Person
from entities.organization import Organization
from entities.report import Report
from rich.console import Console
from rich.progress import Progress
from rich.logging import RichHandler


class FormattingSystem:

    def __init__(self, input_sink, out_sink, console=Console()):
        self.in_sink = input_sink
        self.out_sink = out_sink
        self.lock = threading.Lock()
        self.console = console

    def process_queue(self):
        while not self.in_sink.is_empty():
            items = self.in_sink.dequeue()

            entity_class = None
            prev_headers = None

            with Progress() as progress:
                task = progress.add_task(f'Processing {len(items)} item(s)...',
                                         total=len(items),
                                         style='bold green')
                for i, item in enumerate(items):
                    headers = self.get_column_headers(item.keys())
                    if prev_headers != headers or entity_class is None:
                        prev_headers = headers
                        entity_class = self.fitness_score(headers)
                        entity = entity_class()
                    else:
                        entity = entity_class()

                    entity.add_data(item)
                    json_data = json.dumps(entity.data)
                    self.out_sink.enqueue(json_data)

                    progress.update(task, advance=1)

            self.console.print('\nCompleted processing items.', style='green')

    @staticmethod
    def fitness_score(headers):
        person_score = Person.score_attributes(headers)
        organization_score = Organization.score_attributes(headers)
        report_score = Report.score_attributes(headers)
        scoreboard = {Person: person_score,
                      Organization: organization_score,
                      Report: report_score}

        top_scorer = max(scoreboard, key=scoreboard.get)
        # print(f'\nThis document relates to a(n) {top_scorer.__name__}.\n'
        #            f'All entries in this document will be treated as such.')
        return top_scorer

    @staticmethod
    def get_column_headers(keys):
        headers = []
        for key in keys:
            headers.append(key)
        return headers








