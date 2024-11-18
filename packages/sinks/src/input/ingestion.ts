// src/utils/inputSink.ts
import { PulsarContext, sendData, receiveDataIterator } from '../ctx.ts';
import { BinaryPayloadSchema, MessageSchema, type InferSchema } from '@groovybytes/schema/src/index.ts';
import { interleaveIterators, sendToPython } from '../utils.ts';
import { decodeBase64 } from '@std/encoding';

export async function runIngestionInputSink() {
  const ctx = new PulsarContext();

  const formats = ['json', 'csv', 'xml', 'binary', 'text'];
  // const dataIter = interleaveIterators(
  //   ...formats.map((fmt) => {
  //     return receiveDataIterator(
  //       ctx,
  //       `persistent://public/ingestion/input.${fmt}`,
  //       `ingestion-input-sink-${fmt}`
  //     )
  //   })
  // );

  const dataIter = receiveDataIterator(
    ctx,
    `persistent://public/ingestion/input.csv`,
    `ingestion-input-sink-csv`
  );

  for await (const data of dataIter) {
    if (!data) { continue; }

    const { success, data: message } = MessageSchema.safeParse(data)
    if (!success) {
      console.error('Invalid message received:', data);
      continue;
    }

    console.log('(Ingestion Input Sink) Received data:', data);

    const payload = decodeBase64((message.payload as InferSchema<typeof BinaryPayloadSchema>).data);
    const blob = new Blob([payload], { type: message.meta.fileType });
    const file = new File([blob], message.meta.fileName ?? "unknown-file", { type: message.meta.fileType });
    await sendToPython("file", file);
    // await sendData(ctx, data);
  }
}
