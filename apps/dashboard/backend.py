import json
import threading
from flask import Flask, request, jsonify
import queue
import requests

app = Flask(__name__)
data_queue = queue.Queue()  # A thread-safe queue

@app.route('/dashboard_api/data', methods=['POST'])
def receive_data():
    data = json.loads(request.json)
    data_queue.put(data)
    return jsonify({"message": "Data processing started"}), 200

@app.route('/dashboard_api/data', methods=['GET'])
def get_data():
    if not data_queue.empty():
        data = data_queue.get()
        return jsonify(data), 200
    return jsonify({"message": "No data available"}), 404

if __name__ == "__main__":
    app.run(debug=False, use_reloader=False, port=8502)
