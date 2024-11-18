import requests
import streamlit as st
import pandas as pd
import plotly.express as px

from flask import Flask, request, jsonify
from threading import Thread

app = Flask(__name__)
RECEIVED_DATA = None

# Handle POST requests
@app.route('/dashboard_api/data', methods=['POST'])
def receive_data():
    global RECEIVED_DATA
    try:
        RECEIVED_DATA = request.get_json()
        return jsonify({"message": "Data recieved successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    

# handle GET requests (for debugging)
@app.route('/dashboard_api/data', methods=['GET'])
def get_data():
    global RECEIVED_DATA
    if RECEIVED_DATA:
        return jsonify(RECEIVED_DATA), 200
    else:
        return jsonify({"message": "No data available"}), 404


# start flask in separate thread
def start_flask():
    app.run(port=8503, debug=False, use_reloader=False)


# fetch processed data from global variable
def fetch_formatted_data():
    global RECEIVED_DATA
    try:
        if RECEIVED_DATA is not None:
            st.success("Data Recieved Successfully!")
            return pd.DataFrame(RECEIVED_DATA)
        else:
            st.info("Waiting for data from the analysis engine...")
            return None
    except Exception as e:
        st.error(f"Failed to fetch data: {e}")
        return None


# Display Data Overview
def display_data_overview(data):
    st.write("### Data Overview")
    st.write(f"Total Records: {len(data)}")
    st.write(f"Columns: {', '.join(data.columns)}")
    st.write("### Sample Data")
    st.write(data.head())

# Visualize data
def visualize_data(data):
    st.write("### Data Visualization")
    column_to_plot = st.selectbox("Choose a column to visualize", data.columns)
    if column_to_plot:
        fig = px.bar(data, x=column_to_plot)
        st.plotly_chart(fig)

# MAIN
def main():
    st.title("GroovyBytes Dashboard PWAPI")
    st.subheader("Data Overview and Visualizations")

    st.sidebar.header("Upload Data")
    uploaded_file = st.sidebar.file_uploader("Upload CSV, JSON, XLS, XLSX file", type=['csv', 'json', 'xls', 'xlsx'])

    # Flag to control when to fetch formatted data
    data_ready_to_fetch = False

    if uploaded_file is not None:
        # Upload to ingestion system
        st.info("Uploading to ingestion system...")
        files = {'file': (uploaded_file.name, uploaded_file.getvalue())}
        response = requests.post("http://127.0.0.1:5000/ingestion/upload", files=files)

        if response.status_code == 200:
            st.success("File successfully sent to ingestion system.")
            data_ready_to_fetch = True
        else:
            st.error(f"Ingestion system error: {response.text}")


    # Fetch data from analysis engine
    if data_ready_to_fetch:
        data = fetch_formatted_data()

        if data is not None:
            display_data_overview(data)
            visualize_data(data)
        else: st.warning("No data received yet. Please wait...")
    
    # TODO: Notifications panel integration with communication layer
    st.sidebar.header("Notifications")
    st.sidebar.write("No new notifications.")


if __name__ == "__main__":
    flask_thread = Thread(target=start_flask, daemon=True)
    flask_thread.start()

    main()
