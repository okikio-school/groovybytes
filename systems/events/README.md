# Event System

### Steps to Deploy:

1. **Create the `bkvm.conf` file**: Ensure you have a `bkvm.conf` file in your current working directory with the appropriate Pulsar Manager configuration.

2. **Run Docker Compose**: Use the following command to start the services:
   ```sh
   docker-compose up -d
   ```

3. **Initialize Superuser**: After the containers are running, initialize the superuser using the following commands:
   ```sh
   CSRF_TOKEN=$(curl http://localhost:7750/pulsar-manager/csrf-token)
   curl -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
        -H "Cookie: XSRF-TOKEN=$CSRF_TOKEN;" \
        -H "Content-Type: application/json" \
        -X PUT http://localhost:7750/pulsar-manager/users/superuser \
        -d '{"name": "admin", "password": "apachepulsar", "description": "test", "email": "username@test.org"}'
   ```

You can then access the Pulsar Manager web UI at `http://localhost:9527` using the default credentials:  
- **Username**: `admin`  
- **Password**: `apachepulsar`

This configuration ensures all required ports are mapped and the containers are linked for intercommunication.


After running these steps, the Pulsar Manager is running locally at http://127.0.0.1:9527/#/environments.

## Access Pulsar Manager

1. Access Pulsar manager UI at `http://${frontend-end-ip}/#/environments`.

    If you started Pulsar Manager using docker or docker-compose, the Pulsar Manager is running at port 9527. You can access the Pulsar Manager UI at http://127.0.0.1:9527/#/environments.

    If you are deploying Pulsar Manager 0.1.0 using the released container, you can log in the Pulsar Manager UI using the following credentials.

    * Account: `pulsar`
    * Password: `pulsar`

    If you are deploying Pulsar Manager using the latest code, you can create a super-user using the following command. Then you can use the super user credentials to log in the Pulsar Manager UI.

    ```
    CSRF_TOKEN=$(curl http://localhost:7750/pulsar-manager/csrf-token)
    curl \
        -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
        -H "Cookie: XSRF-TOKEN=$CSRF_TOKEN;" \
        -H 'Content-Type: application/json' \
        -X PUT http://localhost:7750/pulsar-manager/users/superuser \
        -d '{"name": "admin", "password": "apachepulsar", "description": "test", "email": "username@test.org"}'
    ```

    * `backend-service`: The IP address or domain name of the backend service.
    * `password`: The password should be more than or equal to 6 digits.

2. Create an environment.

    An environment represents a Pulsar instance or a group of clusters you want to manage. A Pulsar Manager is capable of managing multiple environments.

    - Click "New Environment" button to add an environment.
    - Input the "Environment Name". The environment name is used for identifying an environment.
    - Input the "Service URL". The Service URL is the admin service url of your Pulsar cluster.
        - You need to make sure the service url that Pulsar Manager is able to access. In this example, both pulsar container and pulsar-manager container are linked. So you can use pulsar container name as the domain name of the pulsar standalone cluster. Thus you can type `http://pulsar-standalone:8080`.
    - Input the "Bookie URL". In this example, you can type `http://pulsar-standalone:6650`

---

To handle various **data source formats** effectively within the Pulsar messaging system, we need to integrate the data format characteristics into the **message schema**, **topic structure**, and **Pulsar client configurations**. Here’s how you can incorporate different data formats:

### **Handling Data Source Formats**

#### **1. Key Data Formats to Address**
1. **Structured Data**: SQL/NoSQL databases.
2. **Semi-Structured Data**: JSON, XML, YAML, CSV.
3. **Unstructured Data**: Files (images, videos, text).
4. **Streaming Data**: MQTT, WebSockets, or other brokers.
5. **Data Transfer Protocols**: HTTP, FTP, etc.

#### **2. Incorporating Data Formats into Pulsar**

**a. Use Message Properties**
- Pulsar supports **message properties**, which are key-value pairs stored alongside the message payload.
- Include metadata in properties for each message to describe the source, format, and other details.

**Example Properties**:
- `format`: `json`, `csv`, `xml`, `binary`.
- `sourceType`: `sql`, `nosql`, `filesystem`, `mqtt`.
- `sourceId`: Unique identifier for the data source.
- `compression`: `gzip`, `snappy`, etc. (if payloads are compressed).

**b. Design Topic Subscriptions by Format**
- To simplify consumer logic, create sub-topics or subscriptions based on data formats.
- For example:
  - `public/ingestion/input/json`
  - `public/ingestion/input/csv`
  - `public/ingestion/input/xml`

---

### **Updated Namespaces/Topics with Data Formats**

| **Namespace**       | **Topic**                  | **Partitions** | **Purpose**                              | **Format**   |
|----------------------|----------------------------|----------------|------------------------------------------|--------------|
| `ingestion`          | `input/json`              | 3              | Receives JSON data.                      | JSON         |
| `ingestion`          | `input/csv`               | 3              | Receives CSV data.                       | CSV          |
| `ingestion`          | `input/xml`               | 3              | Receives XML data.                       | XML          |
| `ingestion`          | `output`                  | 3              | Sends merged data streams onward.        | Mixed        |
| `formatting`         | `input`                   | 3              | Receives data for sanitization.          | Mixed        |
| `formatting`         | `output`                  | 3              | Sends formatted data to analysis.        | Mixed        |
| `analysis`           | `input`                   | 3              | Receives formatted data.                 | Mixed        |
| `analysis`           | `output`                  | 3              | Sends analysis results to dashboard.     | Mixed        |
| `logging`            | `system`                  | 1              | Logs system-wide operations.             | Logs         |
| `notifications`      | `alerts`                  | 1              | Sends alerts to notification systems.    | Alerts       |
| `errors`             | `system`                  | 1              | Captures system error messages.          | Errors       |

---

### **3. Message Schema for Data Formats**

Use Zod to incorporate `format` and `sourceType` into your message schema.

```ts
import { z } from "zod";

// Metadata schema to handle source and format details
export const DataSourceMetadataSchema = z.object({
  format: z.enum(['json', 'csv', 'xml', 'binary', 'text']), // Data format
  sourceType: z.enum(['sql', 'nosql', 'filesystem', 'mqtt', 'http']), // Data source type
  sourceId: z.string().optional(), // Unique identifier for the source
  compression: z.enum(['none', 'gzip', 'snappy']).optional(), // Compression type
});

// Extend the MetadataSchema to include the data source details
export const MetadataSchema = MetadataSchema.extend({
  dataSource: DataSourceMetadataSchema.optional(),
});

// Example payload for JSON data
export const JsonPayloadSchema = z.object({
  data: z.record(z.any()), // Key-value pairs
});

// Example payload for CSV data
export const CsvPayloadSchema = z.object({
  rows: z.array(z.record(z.string())), // Array of rows with string key-value pairs
});

// Example unified payload schema
export const PayloadSchema = z.union([
  JsonPayloadSchema,
  CsvPayloadSchema,
  // Add other payload schemas (XML, binary, etc.)
]);

// Message schema
export const MessageSchema = z.object({
  header: HeaderSchema,
  payload: PayloadSchema,
  meta: MetadataSchema,
});

// Example message for a JSON payload
const jsonMessage = {
  header: {
    messageId: 'uuid-1234',
    source: 'input-sink-1',
    destination: 'ingestion/input/json',
    timestamp: Date.now(),
    type: 'data',
    protocolVersion: '1.0',
  },
  payload: {
    data: {
      temperature: 22.5,
      humidity: 60,
    },
  },
  meta: {
    dataSource: {
      format: 'json',
      sourceType: 'filesystem',
      sourceId: 'file-001',
    },
    priority: 'high',
  },
};

// Validate the JSON message
const parsedMessage = MessageSchema.safeParse(jsonMessage);
if (!parsedMessage.success) {
  console.error(parsedMessage.error);
} else {
  console.log('Validated Message:', parsedMessage.data);
}
```

---

### **4. Script Updates for Data Formats**

The Bash script will now:
1. Create additional topics for different data formats.
2. Organize topics by format under the `ingestion` namespace.

```bash
#!/bin/bash

# Pulsar Admin REST API URL
PULSAR_ADMIN_URL="http://localhost:8080/admin/v2"

# Namespaces and Topics
declare -A NAMESPACES_TOPICS=(
  ["ingestion"]="input/json:3 input/csv:3 input/xml:3 output:3"
  ["formatting"]="input:3 output:3"
  ["analysis"]="input:3 output:3"
  ["logging"]="system:1"
  ["notifications"]="alerts:1"
  ["errors"]="system:1"
)

# Start Pulsar with Docker Compose
echo "Starting Pulsar with Docker Compose..."
docker-compose up -d

# Check if Pulsar is ready
function is_pulsar_ready {
  curl -s "${PULSAR_ADMIN_URL}/clusters" > /dev/null
  return $?
}

echo "Waiting for Pulsar to be ready..."
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

echo "Pulsar setup complete!"
```

---

### **Summary**
1. **Namespaces and Topics**:
   - Include topics specific to data formats (e.g., `input/json`, `input/csv`).

2. **Message Schema**:
   - Add metadata fields for `format`, `sourceType`, `compression`, and `sourceId`.

3. **Bash Script**:
   - Automate creation of format-specific topics in `ingestion`.

This setup accommodates various data formats while keeping the system modular and extensible. Let me know if you need further refinements!
