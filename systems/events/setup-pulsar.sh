#!/bin/bash

# Variables
PULSAR_ADMIN_URL="http://localhost:8080/admin/v2"
NAMESPACES=(
  "public/ingestion"
  "public/processing"
  "public/analysis"
  "public/monitoring"
  "public/alerts"
  "public/logging"
  "public/error-handling"
)
TOPICS=(
  "public/ingestion/data.input:3"
  "public/ingestion/data.merged-streams:3"
  "public/processing/data.processing-flags:3"
  "public/analysis/data.analysis-results:3"
  "public/monitoring/status.systems:1"
  "public/alerts/event.alerts:1"
  "public/logging/logs.system-logs:1"
  "public/error-handling/event.errors:1"
)

# Start Pulsar using Docker Compose
echo "Starting Pulsar with Docker Compose..."
docker-compose up -d

# Function to check if Pulsar is ready
function is_pulsar_ready {
  curl -s "${PULSAR_ADMIN_URL}/clusters" > /dev/null
  return $?
}

# Wait for Pulsar to be ready
echo "Waiting for Pulsar to be ready..."
while ! is_pulsar_ready; do
  echo "Pulsar is not ready yet. Retrying in 5 seconds..."
  sleep 5
done
echo "Pulsar is ready!"

# Create namespaces
echo "Creating namespaces..."
for namespace in "${NAMESPACES[@]}"; do
  curl -s -X PUT "${PULSAR_ADMIN_URL}/namespaces/${namespace}" -H "Content-Type: application/json"
  echo "Created namespace: ${namespace}"
done

# Create topics
echo "Creating topics..."
for topic in "${TOPICS[@]}"; do
  IFS=":" read -r namespace_topic partitions <<< "$topic"
  curl -s -X PUT "${PULSAR_ADMIN_URL}/persistent/${namespace_topic}/partitions" \
    -H "Content-Type: application/json" \
    -d "$partitions"
  echo "Created topic: ${namespace_topic} with $partitions partitions"
done

# Set up default credentials
echo "Setting up basic credentials..."
curl -s -X POST "${PULSAR_ADMIN_URL}/tenants/public" \
  -H "Content-Type: application/json" \
  -d '{"allowedClusters": ["standalone"], "adminRoles": ["admin"]}'
echo "Pulsar setup complete!"
