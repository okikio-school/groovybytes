import { MessageSchema } from "./schema.ts";

/**
 * Example usage: Validating a data message.
 */
const exampleDataMessage = {
  header: {
    messageId: "data-001",
    source: "sensor-xyz",
    destination: "sink-analysis",
    timestamp: Date.now(),
    type: "data",
    protocolVersion: "1.0",
  },
  payload: {
    data: {
      temperature: 22.4,
      humidity: 60,
    },
  },
  meta: {
    data: {
      type: "event-system",
      source: "mqtt://broker-url/topic-name",
    },
    traceIds: ["trace-001"],
    retry: {
      maxRetries: 3,
      remainingRetries: 2,
    },
    ttl: 60000, // Time-to-live: 1 minute
    expiryTimestamp: Date.now() + 60000, // Expiry timestamp
    throughput: 500, // Throughput in KB/sec
    latency: 50, // Latency in milliseconds
    priority: "normal", // Priority level
  },
};

// Validate the example message
const parsedMessage = MessageSchema.parse(exampleDataMessage);
console.log("Validated Message:", parsedMessage);


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
const parsedMessage2 = MessageSchema.safeParse(jsonMessage);
if (!parsedMessage2.success) {
  console.error(parsedMessage2.error);
} else {
  console.log('Validated Message:', parsedMessage2.data);
}