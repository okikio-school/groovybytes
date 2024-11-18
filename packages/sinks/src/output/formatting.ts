// src/utils/outputSink.ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { sendToPython } from '../utils.ts';

export async function runFormattingOutputSink(port = 5024) {
  const app = new Hono()

  app.get('/', (c) => c.text('Hono!'))
  app.post('/upload', async (c) => {
    const data = (await c.req.json());
    const payload = data;

    console.log('(Formatting Output Sink) Sending data:', payload);
    await sendToPython("json", payload, { pythonUrl: 'http://localhost:8503/dashboard_api/data' });
    c.json({ message: 'File uploaded successfully' })
  })

  serve({
    fetch: app.fetch,
    port
  })
}
