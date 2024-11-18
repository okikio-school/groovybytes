#!/bin/bash

# Pulsar Admin REST API URL
PULSAR_ADMIN_URL="http://localhost:8080/admin/v2"
PULSAR_CSRF_URL="http://localhost:7750/pulsar-manager/csrf-token"

# Namespaces and Topics
declare -A NAMESPACES_TOPICS=(
  ["ingestion"]="input.json:3 input.csv:3 input.xml:3 input.text:3 input.binary:3 output:3"
  ["formatting"]="input:3 output:3"
  ["analysis"]="input:3 output:3"
  ["logging"]="system:1"
  ["notifications"]="alerts:1"
  ["errors"]="system:1"
)

# Start Pulsar with Docker Compose
echo "Starting Pulsar with Docker Compose..."
docker-compose down
docker-compose up -d

# Check if Pulsar is ready
function is_pulsar_ready {
  curl -s "${PULSAR_ADMIN_URL}/clusters" > /dev/null
  return $?
}

echo "Waiting for Pulsar to be ready..."
sleep 20

while ! is_pulsar_ready; do
  echo "Pulsar is not ready yet. Retrying in 5 seconds..."
  sleep 5
done
echo "Pulsar is ready!"

# Create namespaces and topics
for namespace in "${!NAMESPACES_TOPICS[@]}"; do
  echo "Creating namespace: ${namespace}"
  curl -s -X PUT "${PULSAR_ADMIN_URL}/namespaces/public/${namespace}" -H "Content-Type: application/json"

  topics=${NAMESPACES_TOPICS[$namespace]}
  IFS=" " read -r -a topic_array <<< "$topics"
  for topic_data in "${topic_array[@]}"; do
    IFS=":" read -r topic partitions <<< "$topic_data"
    echo "Creating topic: public/${namespace}/${topic} with ${partitions} partitions"
    curl -s -X PUT "${PULSAR_ADMIN_URL}/persistent/public/${namespace}/${topic}/partitions" \
      -H "Content-Type: application/json" \
      -d "$partitions"
  done
done


# Check if Pulsar is ready
function is_pulsar_manager_ready {
  curl -s "${PULSAR_CSRF_URL}" > /dev/null
  return $?
}

echo "Waiting for Pulsar Manager to be ready..."

sleep 20
while ! is_pulsar_manager_ready; do
  echo "Pulsar Manager is not ready yet. Retrying in 5 seconds..."
  sleep 5
done

echo "Creating Pulsar Manager superuser..."

CSRF_TOKEN=$(curl "${PULSAR_CSRF_URL}")
curl -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
    -H "Cookie: XSRF-TOKEN=$CSRF_TOKEN;" \
    -H "Content-Type: application/json" \
    -X PUT http://localhost:7750/pulsar-manager/users/superuser \
    -d '{"name": "admin", "password": "apachepulsar", "description": "test", "email": "username@test.org"}'

echo ""
echo ""
echo "Pulsar Manager superuser created!"
echo "Pulsar Manager URL: http://localhost:9527/#/environments"
echo ""

echo "User: admin"
echo "Password: apachepulsar"
echo ""

echo "New Environment"
echo "Environment Name: standalone"
echo "Service URL: http://pulsar-standalone:8080"
echo "Bookie URL: http://pulsar-standalone:6650"
echo ""

echo "Pulsar setup complete!"