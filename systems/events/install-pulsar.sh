#!/bin/bash

# Set variables
PULSAR_VERSION="4.0.0"
PULSAR_TAR="apache-pulsar-${PULSAR_VERSION}-bin.tar.gz"
PULSAR_DIR="apache-pulsar-${PULSAR_VERSION}"

# Download the tar.gz file if it doesn't exist
if [ ! -f "${PULSAR_TAR}" ]; then
  echo "Downloading Apache Pulsar..."
  wget "https://archive.apache.org/dist/pulsar/pulsar-${PULSAR_VERSION}/${PULSAR_TAR}"
fi

# Extract the tar.gz file if the directory doesn't exist
if [ ! -d "${PULSAR_DIR}" ]; then
  echo "Extracting Apache Pulsar..."
  tar xzf "${PULSAR_TAR}"
fi

# Start Pulsar in the background using the absolute path
echo "Starting Pulsar..."
nohup "${PULSAR_DIR}/bin/pulsar" standalone > pulsar.log 2>&1 &

# Get the PID of the Pulsar process
PULSAR_PID=$!

echo "Pulsar is starting with PID ${PULSAR_PID}"

# Function to check if Pulsar is up
check_pulsar() {
  until curl -s http://localhost:8080/admin/v2/clusters > /dev/null; do
    echo "Waiting for Pulsar to start..."
    sleep 5
  done
  echo "Pulsar is up and running."
}

# Wait for Pulsar to initialize
check_pulsar

# Run the setup script
if [ -f "./setup-topics.sh" ]; then
  echo "Running setup-topics script..."
  chmod +x ./setup-topics.sh
  ./setup-topics.sh
else
  echo "Setup script not found. Skipping setup."
fi

echo "Pulsar setup complete. You can check 'pulsar.log' for details."

# Optionally, keep the script running if you need to
# wait or monitor something else, or exit if done.

# Example: Wait for Pulsar to be stopped manually
wait ${PULSAR_PID}
