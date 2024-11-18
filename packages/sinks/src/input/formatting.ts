// src/utils/inputSink.ts
import { PulsarContext, sendData, receiveDataIterator } from '../ctx.ts';
import { BinaryPayloadSchema, MessageSchema, type InferSchema } from '@groovybytes/schema/src/index.ts';
import { sendToPython } from '../utils.ts';
import { decodeBase64 } from '@std/encoding';

export async function runFormattingInputSink() {
  const ctx = new PulsarContext();

  const subscription = 'formatting-input-sink';
  const topic = 'persistent://public/formatting/input';
  const dataIter = receiveDataIterator(ctx, topic, subscription);

  for await (const data of dataIter) {
    if (!data) { continue; }

    const { success, data: message } = MessageSchema.safeParse(data)
    if (!success) {
      console.error('Invalid message received:', data);
      continue;
    }

    console.log('Received data:', data);

    const payload = (message.payload as InferSchema<typeof BinaryPayloadSchema>).data;
    await sendToPython("json", payload);
    // await sendData(ctx, data);
  }
}
