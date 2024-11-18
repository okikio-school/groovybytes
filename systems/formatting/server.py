import json
import requests
from flask import Flask, request, jsonify
from queue import Queue
from formatting_system import FormattingSystem
from apscheduler.schedulers.background import BackgroundScheduler
from rich.console import Console

OUTPUT_URL = "http://localhost:8502/dashboard_api/data"
console = Console()

app = Flask(__name__)


class Sink:
    def __init__(self, url=None, max_items=100):
        self.MAX_ITEM_COUNT = max_items
        self.q = Queue()
        self.url = url


    def enqueue(self, item):
        self.q.put(item)

    def dequeue(self):
        return self.q.get()

    def is_empty(self):
        return self.q.empty()

    def get_size(self):
        return self.q.qsize()

    def send_output(self):

        if not self.url:
            console.print("There was no endpoint provided "
                          "to the output_sink, no data can be sent.",
                          style='bold yellow')
            return

        out_data = []
        count = 0
        print("\nSending formatted data...")

        while not self.is_empty():
            item = self.q.get()
            out_data.append(item)
            count += 1
        json_data = json.dumps(out_data)

        with app.app_context():
            try:
                res = requests.post(self.url, json=json_data, timeout=10)
                if res.status_code == 200:
                    console.print("\nSuccessfully sent formatted data", style='green')
                    return jsonify({"status": "success", "message": res.json()}, 200)
                else:
                    console.print(f"\nAn error occurred when sending the data:\n"
                                  f"Error code: {res.status_code}\nMessage: {res.text}")
                    return jsonify({"status": "error", "message": res.text}, res.status_code)
            except requests.exceptions.Timeout:
                print('Request timed out. the URL might be down or unreachable.')
                return jsonify({"status": "error", "message": "Request timed out."}, 500)
            except requests.exceptions.RequestException as e:
                print(f'An error occurred: {e}')
                return jsonify({"status": "error", "message": str(e)}, 500)





@app.route('/formatting/process', methods=['POST'])
def process_data():
    try:
        data = json.loads(request.json)  # Get JSON data from request
        console.print('Received data', style='bold green')
        input_sink.enqueue(data)
        console.print('Added data to processing queue', style='bold green')
        return jsonify({"status": "success"}, 200)
    except json.JSONDecodeError as e:
        console.print(f'JSON error: {e}', style='red')
    except Exception as e:
        console.print(f'Error processing data: {e}', style='red')
        return jsonify({"status": "error", "message": str(e)}, 500)

def process_output():
    if not output_sink.is_empty():
        output_sink.send_output()


if __name__ == '__main__':
    input_sink = Sink()
    output_sink = Sink(url=OUTPUT_URL)
    formatting_system = FormattingSystem(input_sink, output_sink)
    scheduler = BackgroundScheduler()
    scheduler.add_job(formatting_system.process_queue, 'interval', seconds=2, max_instances=3)
    scheduler.add_job(process_output, 'interval', seconds=5, max_instances=2)
    scheduler.start()
    try:
        app.run(host='0.0.0.0', port=5001)
    finally:
        scheduler.shutdown(wait=True)
