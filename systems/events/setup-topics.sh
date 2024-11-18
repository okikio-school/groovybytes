#!/bin/bash

# set -x

# Set variables
PULSAR_VERSION="4.0.0"
PULSAR_DIR="apache-pulsar-${PULSAR_VERSION}"

# Cache existing namespaces
existing_namespaces=$("${PULSAR_DIR}/bin/pulsar-admin" namespaces list public)

# Function to check if a namespace exists
namespace_exists() {
  local namespace=$1
  local tenant=${namespace%%/*}
  local namespace_name=${namespace#*/}
  if echo "$existing_namespaces" | grep -w "$namespace" > /dev/null; then
    return 0  # Namespace exists
  else
    return 1  # Namespace does not exist
  fi
}

# Cache existing topics per namespace
declare -A existing_topics_cache

# Function to check if a topic exists
topic_exists() {
  local namespace=$1
  local topic=$2
  local full_topic="persistent://${namespace}/${topic}"

  # Check if topics for this namespace are already cached
  if [[ -z "${existing_topics_cache[$namespace]}" ]]; then
    existing_topics_cache[$namespace]=$("${PULSAR_DIR}/bin/pulsar-admin" topics list "$namespace")
  fi

  if echo "${existing_topics_cache[$namespace]}" | grep -w "$full_topic" > /dev/null; then
    return 0  # Topic exists
  else
    return 1  # Topic does not exist
  fi
}

# Create namespaces
namespaces=(
  "public/ingestion"
  "public/formatting"
  "public/analysis"
  "public/logging"
  "public/notifications"
  "public/errors"
)

echo "Creating namespaces..."
for namespace in "${namespaces[@]}"; do
  if namespace_exists "$namespace"; then
    echo "Namespace $namespace already exists. Skipping creation."
  else
    "${PULSAR_DIR}/bin/pulsar-admin" namespaces create "$namespace"
    echo "Created namespace $namespace."
  fi
done

# Create partitioned topics with 3 partitions
declare -A partitioned_topics
partitioned_topics=(
  ["public/ingestion"]="input.json input.csv input.xml input.binary input.text output"
  ["public/formatting"]="input output"
  ["public/analysis"]="input output"
)

echo "Creating partitioned topics..."
for namespace in "${!partitioned_topics[@]}"; do
  topics=${partitioned_topics[$namespace]}
  for topic in $topics; do
    if topic_exists "$namespace" "$topic"; then
      echo "Topic $namespace/$topic already exists. Skipping creation."
    else
      "${PULSAR_DIR}/bin/pulsar-admin" topics create-partitioned-topic "$namespace/$topic" -p 3
      echo "Created partitioned topic $namespace/$topic."
    fi
  done
done

# Create non-partitioned topics
non_partitioned_topics=(
  "public/logging/system"
  "public/notifications/alerts"
  "public/errors/system"
)

echo "Creating non-partitioned topics..."
for full_topic in "${non_partitioned_topics[@]}"; do
  namespace=${full_topic%/*}
  topic=${full_topic##*/}  # Corrected line

  if topic_exists "$namespace" "$topic"; then
    echo "Topic $namespace/$topic already exists. Skipping creation."
  else
    "${PULSAR_DIR}/bin/pulsar-admin" topics create "$namespace/$topic"
    echo "Created topic $namespace/$topic."
  fi
done