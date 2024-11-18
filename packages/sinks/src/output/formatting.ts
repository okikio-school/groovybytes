// src/utils/outputSink.ts
import { PulsarContext, sendData } from '../ctx.ts';
import { JsonPayloadSchema, MessageSchema, type InferSchema } from '@groovybytes/schema/src/index.ts';

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { sendToPython } from '../utils.ts';

export async function runFormattingOutputSink(port = 5004) {
  const ctx = new PulsarContext();
  const app = new Hono()

  const source = 'ingestion-output-sink';
  const topics = [
    'persistent://public/ingestion/output',
    'persistent://public/formatting/input',
  ];

  app.get('/', (c) => c.text('Hono!'))
  app.post('/upload', async (c) => {
    const data = (await c.req.json());
    const payload = data;

    await Promise.all(
      topics.map(async (topic) => {
        // Generate a unique message ID
        const messageId = crypto.randomUUID();

        // Create the message object conforming to your schema
        const message: InferSchema<typeof MessageSchema> = {
          header: {
            messageId,
            source,
            destination: topic,
            timestamp: Date.now(),
            type: 'data',
            protocolVersion: '1.0',
          },
          payload,
          meta: {
            traceIds: [messageId],
            source: {
              format: "json",
              sourceType: 'filesystem',
            },
          },
        };

        return await Promise.all([
          topic === topics[topics.length - 1] ?
            sendToPython("json", (message.payload as InferSchema<typeof JsonPayloadSchema>).data) :
            Promise.resolve(null),
          sendData(ctx, topic, message),
        ]);
      })
    )
    c.json({ message: 'File uploaded successfully' })
  })

  serve({
    fetch: app.fetch,
    port
  })
}
