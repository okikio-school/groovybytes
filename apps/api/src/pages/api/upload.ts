// src/pages/api/upload.ts
import type { APIRoute } from 'astro';
import type { InferSchema } from '@groovybytes/schema/src/index.ts';

import { PulsarContext, sendData } from '@groovybytes/sinks/src/ctx.ts'; 
import { MessageSchema } from '@groovybytes/schema/src/index.ts';
import { encodeBase64 } from '@std/encoding';
import { parse } from '@std/csv'; 

// This tells Astro to not prerender this page on the server
export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  // Check if the content type is multipart/form-data
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return new Response('Unsupported Content-Type', { status: 400 });
  }

  try {
    // Parse the form data
    const formData = await request.formData();

    // Initialize Pulsar context
    const pulsarContext = new PulsarContext(); // Ensure this is properly initialized

    // Process each file in the form data
    const fileProcessingPromises: Promise<void>[] = [];

    for (const [name, value] of formData.entries()) {
      if (value instanceof File) {
        const file = value;
        console.log(`Processing file: ${file.name}`);

        // Read the file data
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Determine the data format
        let format: 'json' | 'csv' | 'xml' | 'binary' | 'text' = 'binary'; // Default to binary
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          format = 'json';
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          format = 'csv';
        } else if (file.type === 'application/xml' || file.name.endsWith('.xml')) {
          format = 'xml';
        } else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
          format = 'text';
        }


        // Generate a unique message ID
        const messageId = crypto.randomUUID();

        // Set the destination topic based on the format
        const topic = `persistent://public/ingestion/input.${format}`;

        // Create the payload based on the format
        let payload;
        switch (format) {
          case 'json':
            payload = {
              data: JSON.parse(new TextDecoder().decode(uint8Array)),
            };
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
            payload = {
              // Encode file data as base64 string
              data: encodeBase64(uint8Array),
            };
            break;
        }

        // Create the message object conforming to your schema
        const message: InferSchema<typeof MessageSchema> = {
          header: {
            messageId,
            source: 'dashboard-upload',
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

        console.log(`Detected format: ${format}`);
        console.log('Message:', message);

        // Validate the message against the schema
        const validationResult = MessageSchema.safeParse(message);

        if (!validationResult.success) {
          // Handle validation errors
          console.error('Invalid message:', validationResult.error);
          return new Response('Invalid message format', { status: 400 });
        }

        // Send the message to Pulsar
        const sendPromise = sendData(pulsarContext, topic, message)
          .then(() => {
            console.log(`File ${file.name} sent to Pulsar.`);
          })
          .catch((error) => {
            console.error(`Error sending file ${file.name} to Pulsar:`, error);
          });

        fileProcessingPromises.push(sendPromise);
      }
    }

    // Wait for all file processing promises to complete
    await Promise.all(fileProcessingPromises);

    // Close the Pulsar context
    await pulsarContext.close();

    console.log('All files processed and sent to Pulsar.');

    // Return a response to the client
    return new Response('Files uploaded successfully', { status: 200 });
  } catch (error) {
    console.error('Error processing files:', error);
    return new Response('Error processing files', { status: 500 });
  }
};
