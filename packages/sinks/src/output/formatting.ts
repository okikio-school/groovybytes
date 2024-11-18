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
    await sendToPython("json", payload);
    c.json({ message: 'File uploaded successfully' })
  })

  serve({
    fetch: app.fetch,
    port
  })
}
