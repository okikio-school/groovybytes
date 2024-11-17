// src/utils/inputSink.ts
import { PulsarContext, sendData, receiveDataIterator } from '../ctx.ts';
import { parse } from '@std/csv';
import { encodeBase64 } from '@std/encoding';
import { MessageSchema } from '@groovybytes/schema/src/index.ts';

// Utility to send data to a Python process via HTTP
async function sendToPython(payload: any): Promise<void> {
  const pythonUrl = 'http://localhost:5000/process'; // Python server endpoint
  try {
    const response = await fetch(pythonUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Failed to send data to Python: ${response.statusText}`);
    } else {
      console.log('Data successfully sent to Python.');
    }
  } catch (error) {
    console.error('Error sending data to Python:', error);
  }
}

// Function to process incoming files
export async function processFile(
  file: File,
  pulsarContext: PulsarContext
): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Determine the data format
  let format: 'json' | 'csv' | 'xml' | 'binary' | 'text' = 'binary';
  if (file.type === 'application/json' || file.name.endsWith('.json')) {
    format = 'json';
  } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
    format = 'csv';
  } else if (file.type === 'application/xml' || file.name.endsWith('.xml')) {
    format = 'xml';
  } else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
    format = 'text';
  }

  // Create a JSON payload
  let payload;
  switch (format) {
    case 'json':
      payload = { data: JSON.parse(new TextDecoder().decode(uint8Array)) };
      break;
    case 'csv':
      payload = {
        rows: parse(new TextDecoder().decode(uint8Array), { skipFirstRow: true }),
      };
      break;
    case 'xml':
    case 'text':
    case 'binary':
    default:
      payload = { data: encodeBase64(uint8Array) };
      break;
  }

  // Generate a message
  const messageId = crypto.randomUUID();
  const topic = `persistent://public/ingestion/input.${format}`;
  const message = {
    header: {
      messageId,
      source: 'input-sink',
      destination: topic,
      timestamp: Date.now(),
      type: 'data',
      protocolVersion: '1.0',
    },
    payload,
    meta: {
      traceIds: [messageId],
      data: {
        format,
        sourceType: 'filesystem',
        sourceId: file.name,
      },
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    },
  };

  // Validate against the schema
  const validationResult = MessageSchema.safeParse(message);
  if (!validationResult.success) {
    console.error('Validation failed:', validationResult.error);
    throw new Error('Invalid message schema');
  }

  // Send to Pulsar and Python
  await sendData(pulsarContext, topic, message);
  await sendToPython(payload);
  console.log(`File ${file.name} processed successfully.`);
}
