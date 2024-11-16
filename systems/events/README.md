# Event System

### Steps to Deploy:

1. **Create the `bkvm.conf` file**: Ensure you have a `bkvm.conf` file in your current working directory with the appropriate Pulsar Manager configuration.

2. **Run Docker Compose**: Use the following command to start the services (and initialize the tenants/namespaces/topics):

   ```sh
   bash setup-pulsar.sh
   ```

   Or Manually

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

   - `backend-service`: The IP address or domain name of the backend service.
   - `password`: The password should be more than or equal to 6 digits.

This configuration ensures all required ports are mapped and the containers are linked for intercommunication.

After running these steps, the Pulsar Manager is running locally at http://127.0.0.1:9527/#/environments.

## Access Pulsar Manager

1. Access Pulsar manager UI at `http://${frontend-end-ip}/#/environments`.

   If you started Pulsar Manager using docker or docker-compose, the Pulsar Manager is running at port 9527. You can access the Pulsar Manager UI at http://127.0.0.1:9527/#/environments.

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
  - `persistent://public/ingestion/input.json`
  - `persistent://public/ingestion/input.csv`
  - `persistent://public/ingestion/input.xml`

The official format for topics with Pulsar producer and consumer is `persistent://tenant/namespace/topic`.

- `persistent` indicates the topic type. A persistent topic is a topic that retains messages until they are explicitly deleted.
- `tenant` is the tenant name, e.g. `public`.
- `namespace` is the namespace name, e.g. `ingestion`.
- `topic` is the topic name, e.g. `input.json`.

---

### **Updated Namespaces/Topics with Data Formats**

| **Namespace**   | **Topic**      | **Partitions** | **Purpose**                           | **Format** |
| --------------- | -------------- | -------------- | ------------------------------------- | ---------- |
| `ingestion`     | `input.json`   | 3              | Receives JSON data.                   | JSON       |
| `ingestion`     | `input.csv`    | 3              | Receives CSV data.                    | CSV        |
| `ingestion`     | `input.xml`    | 3              | Receives XML data.                    | XML        |
| `ingestion`     | `input.binary` | 3              | Receives binary data.                 | Binary     |
| `ingestion`     | `input.text`   | 3              | Receives text data.                   | Text       |
| `ingestion`     | `output`       | 3              | Sends merged data streams onward.     | Mixed      |
| `formatting`    | `input`        | 3              | Receives data for sanitization.       | Mixed      |
| `formatting`    | `output`       | 3              | Sends formatted data to analysis.     | Mixed      |
| `analysis`      | `input`        | 3              | Receives formatted data.              | Mixed      |
| `analysis`      | `output`       | 3              | Sends analysis results to dashboard.  | Mixed      |
| `logging`       | `system`       | 1              | Logs system-wide operations.          | Logs       |
| `notifications` | `alerts`       | 1              | Sends alerts to notification systems. | Alerts     |
| `errors`        | `system`       | 1              | Captures system error messages.       | Errors     |

The reason why we have multiple partitions is to allow for parallel processing of messages. Each partition can be consumed by a separate consumer, enabling horizontal scaling.

The reason we have separate topics for different data formats is to simplify the processing logic. Consumers can subscribe to topics based on the format they support, making the system more modular and extensible. And we can parallelize the processing of different data formats in input sinks.

---

### **3. Message Schema for Data Formats**

Use Zod to incorporate `format` and `sourceType` into your message schema.

> Note: The message schema is located at [packages/schema/src/schema.ts](../../packages/schema/src/schema.ts)

```ts
// Example message for a JSON payload
const jsonMessage = {
  "header": {
    "messageId": "123e4567-e89b-12d3-a456-426614174000", // Unique identifier for the message
    "source": "service-a", // The system or service sending the message
    "destination": "persisted://public/ingestion/input.json", // The system or service intended to receive the message (right now you have to manually specify the topic but long term we can automate this)
    "timestamp": 1700123456789, // Timestamp in Unix epoch format (milliseconds since 1970)
    "type": "data", // The type of message, validated by MessageTypeSchema (e.g., data, status, event, or log)
    "protocolVersion": "1.0" // Version of the protocol for compatibility between systems
  },
  "payload": {
    "data": {
      "key0": ["value0", 45], // Example key-value pair for structured JSON data
      "values": { 
        "key1": "value1", // Example key-value pair for structured JSON data
        "key2": 42, // Another example showing numeric values
        "key3": true // Boolean values can also be part of the JSON payload
      }
    }
  },
  "meta": {
    "traceIds": ["trace-123", "trace-456"], // Trace IDs for tracking the message flow through systems
    "fileName": "example.csv", // (Optional) Name of the file related to this message
    "fileType": "text/csv", // (Optional) MIME type of the file
    "fileSize": 1024, // (Optional) Size of the file in bytes
    "chunkId": 1, // (Optional) Current chunk ID if the file is split into parts
    "chunkSize": 512, // (Optional) Size of each chunk in bytes
    "totalChunks": 2, // (Optional) Total number of chunks for the file
    "ttl": 60000, // (Optional) Time-to-live in milliseconds for the message
    "expiryTimestamp": 1700123516789, // (Optional) Expiry timestamp in Unix epoch format
    "data": {
      "format": "json", // Data format used for the source (e.g., json, csv, etc.)
      "sourceType": "sql", // Source type (e.g., sql, nosql, filesystem, etc.)
      "sourceId": "database-1", // (Optional) Unique identifier for the source
      "compression": "gzip", // (Optional) Compression type if applicable
      "encryption": "aes-256", // (Optional) Encryption type if applicable
      "checksum": "sha256" // (Optional) Checksum type for verifying data integrity
    },
    "retry": {
      "maxRetries": 3, // Maximum number of retries allowed for processing
      "remainingRetries": 2 // Number of retries still available
    },
    "errorDetails": {
      "lastError": "Connection timeout", // Description of the last encountered error
      "lastErrorTimestamp": 1700123400000 // Timestamp of the last error in Unix epoch format
    },
    "throughput": 100, // (Optional) Data throughput in KB/sec for monitoring performance
    "latency": 50, // (Optional) Latency in milliseconds for message delivery
    "priority": "high" // (Optional) Priority level of the message (e.g., low, normal, high, critical)
  }
};
```
