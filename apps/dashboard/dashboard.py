import asyncio
import queue
import requests
import streamlit as st
import pandas as pd
import plotly.express as px
import json
import warnings

RECEIVED_DATA = None
input_queue = queue.Queue()
warnings.filterwarnings("ignore", message="missing ScriptRunContext!")

# Asynchronous function to fetch processed data
async def fetch_data_async():
    try:
        response = requests.get("http://127.0.0.1:8502/dashboard_api/data")
        if response.status_code == 200:
            input_queue.put(response.json())
        else:
            st.warning("Failed to fetch data or received empty response.")
    except Exception as e:
        st.error(f"Failed to fetch data: {e}")

def format_display_data(data):
    data = pd.DataFrame(data)
    if len(data.columns) == 1 and isinstance(data.iloc[0, 0], str):
        try:
            # Parse JSON strings in the single column
            data = pd.json_normalize(data.iloc[:, 0].apply(json.loads))
        except Exception as e:
            st.error(f"Failed to parse JSON data: {e}")
            return None

    if 'other' in data.columns:
        try:
            # Expand the 'other' column
            flattened_other = pd.json_normalize(data['other'])
            data = data.drop(columns=['other'])
            pd.concat([data, flattened_other], axis=1)
        except Exception as e:
            st.error(f"Failed to flatten 'other' column: {e}")
            return None

    return data

# Display Data Overview
def display_data_overview(data):
    st.write("### Data Overview")
    st.write(f"Total Records: {len(data)}")
    st.write(f"Columns: {', '.join(map(str, data.columns))}")

    if not isinstance(data, pd.DataFrame):
        st.error("Data is not a DataFrame!")
        st.write(type(data))
        return

    if data.empty:
        st.warning("The dataset is empty!")
        return

    st.dataframe(data, height=500)


async def main():
    st.title("GroovyBytes Dashboard PWAPI")
    st.subheader("Data Overview and Visualizations")

    st.sidebar.header("Upload Data")
    uploaded_file = st.sidebar.file_uploader("Upload CSV, JSON, XLS, XLSX file", type=['csv', 'json', 'xls', 'xlsx'])

    # Add a button to trigger the upload action
    upload_button = st.sidebar.button("Upload File")

    # Use session state to track if data has been uploaded or fetched
    if 'data_fetched' not in st.session_state:
        st.session_state.data_fetched = False
    if 'data_uploaded' not in st.session_state:
        st.session_state.data_uploaded = False
    if 'data_ready' not in st.session_state:
        st.session_state.data_ready = False  # New session state to track data readiness

    # Handle file upload logic when the button is clicked
    if uploaded_file is not None and upload_button and not st.session_state.data_uploaded:
        # Reset session state variables when a new file is uploaded
        st.session_state.data_uploaded = False
        st.session_state.data_fetched = False
        st.session_state.data_ready = False

        # Upload to ingestion system only after clicking the upload button
        st.info("Uploading to ingestion system...")
        files = {'file': (uploaded_file.name, uploaded_file.getvalue())}
        response = requests.post("http://127.0.0.1:5000/ingestion/upload", files=files)

        if response.status_code == 200:
            st.success("File successfully sent to ingestion system.")
            st.session_state.data_uploaded = True  # Mark the file as uploaded
            st.session_state.data_fetched = False  # Reset data fetching state after upload
            st.session_state.data_ready = False  # Reset data readiness state after upload
        else:
            st.error(f"Ingestion system error: {response.text}")

        # Show a warning message until the data is ready
        st.warning("No data received yet. Please wait...")

    # Notify the user when the data is ready for fetching
    if st.session_state.data_uploaded and not st.session_state.data_ready:
        st.info("Data is being processed. Please wait until it's ready for fetching.")

    # Fetch data logic is only executed when the fetch button is clicked
    data_placeholder = st.empty()
    fetch_button = st.sidebar.button("Fetch Data")
    if fetch_button and st.session_state.data_uploaded and not st.session_state.data_fetched:
        if st.session_state.data_ready:
            st.session_state.data_fetched = True  # Mark that data is being fetched

            # Start fetching data asynchronously
            await fetch_data_async()

            # Process any data in the queue if available
            while not input_queue.empty():
                item = input_queue.get()
                if item is not None:
                    display_data = format_display_data(item)
                    if display_data is not None:
                        with data_placeholder.container():
                            st.success("Displaying formatted data")
                            display_data_overview(display_data)

            st.warning("Data fetch completed. Click the button again to fetch new data.")
        else:
            st.warning("Data is not ready yet. Please wait for it to be processed.")

    # Ensure fetch button can trigger data fetch again only if new data is uploaded
    if not st.session_state.data_uploaded:
        st.warning("Please upload a file first before fetching data.")

    # Simulate data processing status change (just for demo purposes)
    if st.session_state.data_uploaded and not st.session_state.data_ready:
        # Simulating a data processing delay (this would typically come from a real backend check)
        import time
        time.sleep(5)  # Simulate a processing delay
        st.session_state.data_ready = True  # Mark data as ready after processing

        # Update status here, ensuring it happens after processing
        # st.success("Data is now ready to be fetched. You can click the 'Fetch Data' button.")

    # Allow a new file upload and start over
    reset_button = st.sidebar.button("Upload New File")
    if reset_button:
        st.session_state.data_uploaded = False
        st.session_state.data_fetched = False
        st.session_state.data_ready = False
        st.rerun()  # This will reset the app and allow the user to upload a new file


if __name__ == "__main__":
    asyncio.run(main())
