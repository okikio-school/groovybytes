import { MessageSchema, type InferSchema } from "./schema.ts";

// Example message for a JSON payload
const jsonMessage: InferSchema<typeof MessageSchema> = {
  header: {
    messageId: 'uuid-1234',
    source: 'input-sink-1',
    destination: 'persistent://public/ingestion/input.json',
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
    source: {
      format: 'json',
      sourceType: 'filesystem',
      sourceId: 'file-001',
    },
    traceIds: ['uuid-1234'],
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