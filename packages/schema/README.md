To handle various **data source formats** effectively within the Pulsar messaging system, we need to integrate the data format characteristics into the **message schema**, **topic structure**, and **Pulsar client configurations**. Here’s how you can incorporate different data formats:

---

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
  data: DataSourceMetadataSchema.optional(),
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
    data: {
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

### **Summary**
1. **Namespaces and Topics**:
   - Include topics specific to data formats (e.g., `input/json`, `input/csv`).

2. **Message Schema**:
   - Add metadata fields for `format`, `sourceType`, `compression`, and `sourceId`.

3. **Bash Script**:
   - Automate creation of format-specific topics in `ingestion`.

This setup accommodates various data formats while keeping the system modular and extensible. Let me know if you need further refinements!

---

### **Node.js Script for Pulsar Setup**
```ts
import { execa } from 'execa';
import fetch from 'node-fetch';

// Pulsar Admin REST API URL
const PULSAR_ADMIN_URL = 'http://localhost:8080/admin/v2';

// Namespaces and Topics Configuration
const NAMESPACES_TOPICS = {
  ingestion: ['input/json:3', 'input/csv:3', 'input/xml:3', 'output:3'],
  formatting: ['input:3', 'output:3'],
  analysis: ['input:3', 'output:3'],
  logging: ['system:1'],
  notifications: ['alerts:1'],
  errors: ['system:1'],
};

// Helper: Check if Pulsar is Ready
const isPulsarReady = async () => {
  try {
    const response = await fetch(`${PULSAR_ADMIN_URL}/clusters`);
    return response.ok;
  } catch {
    return false;
  }
};

// Helper: Wait for Pulsar to be Ready
const waitForPulsar = async () => {
  console.log('Waiting for Pulsar to be ready...');
  while (!(await isPulsarReady())) {
    console.log('Pulsar is not ready yet. Retrying in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  console.log('Pulsar is ready!');
};

// Helper: Create a Namespace
const createNamespace = async namespace => {
  const url = `${PULSAR_ADMIN_URL}/namespaces/public/${namespace}`;
  const response = await fetch(url, { method: 'PUT' });
  if (response.ok) {
    console.log(`Created namespace: ${namespace}`);
  } else {
    const error = await response.text();
    console.error(`Failed to create namespace ${namespace}: ${error}`);
  }
};

// Helper: Create a Topic
const createTopic = async (namespace, topic, partitions) => {
  const url = `${PULSAR_ADMIN_URL}/persistent/public/${namespace}/${topic}/partitions`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partitions),
  });
  if (response.ok) {
    console.log(`Created topic: public/${namespace}/${topic} with ${partitions} partitions`);
  } else {
    const error = await response.text();
    console.error(`Failed to create topic ${namespace}/${topic}: ${error}`);
  }
};

// Main Function
const setupPulsar = async () => {
  try {
    console.log('Starting Pulsar with Docker Compose...');
    await execa('docker-compose', ['up', '-d']);

    // Wait for Pulsar to be ready
    await waitForPulsar();

    // Create namespaces and topics
    for (const [namespace, topics] of Object.entries(NAMESPACES_TOPICS)) {
      await createNamespace(namespace);
      for (const topicData of topics) {
        const [topic, partitions] = topicData.split(':');
        await createTopic(namespace, topic, parseInt(partitions, 10));
      }
    }

    console.log('Pulsar setup complete!');
  } catch (error) {
    console.error('Error during Pulsar setup:', error);
  }
};

// Run the setup
setupPulsar();
```
