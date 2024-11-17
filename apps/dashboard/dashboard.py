import streamlit as st
import pandas as pd
import plotly.express as px

# Header
st.title("GroovyBytes Dashboard Prototype")
st.subheader("Data Overview and Visualizations")

# Sidebar for file upload
st.sidebar.header("Data Upload")
uploaded_file = st.sidebar.file_uploader("Upload a CSV or JSON file", type=['csv', 'json'])

# Data Overview Section
if uploaded_file is not None:
    # Read data
    if uploaded_file.name.endswith('.csv'):
        data = pd.read_csv(uploaded_file)
    else:
        data = pd.read_json(uploaded_file)
    
    # POST http://localhost:4321/api/upload `FormData` (refer to https://github.com/okikio-school/groovybytes/blob/2ae687e095cc301a1ff63eadae69b0ab21027063/apps/api/src/components/FileUploader.tsx#L57-L65)
    st.write("### Data Overview")
    st.write(f"Total Records: {len(data)}")
    st.write(f"Columns: {', '.join(data.columns)}")

    # Show a snippet of the data
    st.write("### Sample Data")
    st.write(data.head())

    # Basic Visualization
    st.write("### Data Visualization")
    column_to_plot = st.selectbox("Choose a column to visualize", data.columns)
    if column_to_plot:
        fig = px.histogram(data, x=column_to_plot)
        st.plotly_chart(fig)

    # Query Input Section
    st.write("### Custom Query")
    query_column = st.selectbox("Choose column to filter", data.columns)
    query_value = st.text_input("Enter value to filter by")
    if query_column and query_value:
        filtered_data = data[data[query_column] == query_value]
        st.write("Filtered Data")
        st.write(filtered_data)

else:
    st.write("Please upload a data file to proceed.")

# Notifications Panel
st.sidebar.header("Notifications")
st.sidebar.write("No new notifications.")
