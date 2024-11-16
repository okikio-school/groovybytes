import time
import threading
import sys
from entities.person import Person
from entities.organization import Organization
from entities.report import Report
from input_sink import FileMonitor
from output_sink import OutputSink

def fitness_score(headers):
    person_score = Person.score_attributes(headers)
    organization_score = Organization.score_attributes(headers)
    report_score = Report.score_attributes(headers)
    scoreboard = {Person: person_score,
                  Organization: organization_score,
                  Report: report_score}

    top_scorer = max(scoreboard, key=scoreboard.get)
    print(f"This document relates to a(n) {top_scorer.__name__}.\n"
          f"All entries in this document will be treated as such.")
    return top_scorer

def standardize_dates():
    print(f'Standardizing dates')

def standardize_numbers():
    print(f'Standardize numbers')

def get_column_headers(keys):
    headers = []
    for key in keys:
        headers.append(key)
    return headers


def handle_input_queue():
    print("Handling input queue")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(len(sys.argv))
        print("Please run the file with two arguments <input_file_path> <output_file_directory>")
        print("Note enter the complete paths")
        exit(0)
    else:
        file_path = sys.argv[1]
        output_file = sys.argv[2]

    file_monitor = FileMonitor(file_path)
    file_monitor_thread = threading.Thread(target=file_monitor.start_monitor)
    print("Starting file monitor thread")
    file_monitor_thread.start()
    input_queue = file_monitor.input_sink

    output = OutputSink(output_file)
    output_thread = threading.Thread(target=output.start)
    output_thread.start()

    previous_headers = []
    EntityClass = None
    printOnce = False
    while True:
        try:
            if not input_queue.is_empty():
                item = vars(input_queue.dequeue())
                column_headers = get_column_headers(item.keys())
                if column_headers != previous_headers:
                    EntityClass = fitness_score(column_headers)
                    previous_headers = column_headers

                if EntityClass is not None:
                    entity = EntityClass()
                    entity.add_data(item)
                    output.enqueue((entity.__class__.__name__, entity.data))

            else:
                time.sleep(1)
        except KeyboardInterrupt:
            file_monitor.stop_monitor()
            file_monitor_thread.join()
            output.stop()
            output_thread.join()
            print("Exiting program...")
            break
        except Exception as e:
            print(f'Error occurred: {e}')
            continue


    # table_headers = ['Index', 'Customer', 'First Name', "Last Name", "Company", "City",
    #                  "Country", "Phone", "Email", "Subscription", "Website"]
    # item = {
    #     'Index': "1",
    #     'Customer': "CXASAD624VAD143",
    #     "fname": "Johvonne",
    #     "Last Name": "Keane",
    #     "Company": "Ericsson",
    #     "Country": "Canada",
    #     "City": "Oshawa",
    #     "Email Address": "Johvonne@gmail.com",
    #     "Phone": "6475633725",
    #     "Subscription": "Youtube",
    #     "Website": "123Yahmon.ca",
    #     "Location": "Behind you"
    # }
    # EntityClass = fitness_score(table_headers)
    # entity = EntityClass()
    # entity.add_data(item)


    # table_headers = ['Account', 'Business Unit', 'Currency', 'Year',
    #                  'Scenario']
    # EntityClass = fitness_score(table_headers)
    # entity = EntityClass(table_headers)
    #
    #
    #
    # table_headers = ['Index', 'Organization', 'Website',
    #                  'Country', 'Description', 'Founded',
    #                  'Industry', 'Number of Employees']
    # EntityClass = fitness_score(table_headers)
    # entity = EntityClass(table_headers)





