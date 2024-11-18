// src/utils/inputSink.ts
import type { JsonType } from '@groovybytes/schema/src/utils.ts';
import { MessageSchema } from '@groovybytes/schema/src/index.ts';

import { PulsarContext, sendData } from './ctx.ts';
import { encodeBase64 } from '@std/encoding';
import { parse } from '@std/csv';

interface SendToPythonOptions {
  pythonUrl?: string;
}

// Utility to send data to a Python process via HTTP
export async function sendToPython(type: 'file', payload: File, opts?: SendToPythonOptions): Promise<void>;
export async function sendToPython(type: 'json', payload: JsonType, opts?: SendToPythonOptions): Promise<void>;
export async function sendToPython(type: "file" | "json", payload: File | JsonType, opts: SendToPythonOptions = {}): Promise<void> {
  const pythonUrl = opts.pythonUrl ?? 'http://localhost:5000/ingestion/upload'; // Python server endpoint
  try {
    const formData = new FormData();
    if (type === "file") formData.append('file', payload as File);

    const fetchOpts = type === "file" ? {
      method: 'POST',
      body: formData,
    } : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }

    const response = await fetch(pythonUrl, fetchOpts);

    // Parse the JSON response
    const result = await response.json();

    if (response.ok) {
      console.log('File uploaded successfully to Python:', result);
    } else {
      console.error(`Failed to upload file to Python (${response.statusText}):`, result);
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
  let payload = {};
  switch (format) {
    case 'json':
      // payload = { data: JSON.parse(new TextDecoder().decode(uint8Array)) };
      // break;
    case 'csv':
      // payload = {
      //   rows: parse(new TextDecoder().decode(uint8Array), { skipFirstRow: true }),
      // };
      // break;
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
  // await sendToPython(payload);
  console.log(`File ${file.name} processed successfully.`);
}

/**
 * Interleaves multiple asynchronous iterators, yielding values in a round-robin fashion until all iterators are exhausted.
 *
 * @template T - The type of elements yielded by the iterators.
 * @param {...AsyncIterator<T>[]} iterators - One or more asynchronous iterators to interleave.
 * @returns {AsyncGenerator<T, void, unknown>} An asynchronous generator that yields values from the provided iterators interleaved.
 *
 * @example
 * ```typescript
 * async function* gen1() { yield 1; yield 4; yield 7; }
 * async function* gen2() { yield 2; yield 5; yield 8; }
 * async function* gen3() { yield 3; yield 6; yield 9; }
 *
 * const interleavedIterator = interleaveIterators(gen1(), gen2(), gen3());
 *
 * for await (let value of interleavedIterator) {
 *   console.log(value);
 * }
 * // Output: 1, 2, 3, 4, 5, 6, 7, 8, 9
 * ```
 */
export async function* interleaveIterators<T>(...iterators: AsyncIterator<T>[]): AsyncGenerator<T, void, unknown> {
  // Initialize an array to hold the current promise from each iterator
  let iteratorStates = iterators.map(iterator => ({
    iterator,
    promise: iterator.next(),
  }));

  while (iteratorStates.length > 0) {
    // Iterate over each iterator state
    for (let i = 0; i < iteratorStates.length; ) {
      const state = iteratorStates[i];
      const result = await state.promise;

      if (!result.done) {
        yield result.value as T;
        // Fetch the next promise for the iterator
        state.promise = state.iterator.next();
        i++; // Move to the next iterator
      } else {
        // Remove exhausted iterator
        iteratorStates.splice(i, 1);
      }
    }
  }
}

