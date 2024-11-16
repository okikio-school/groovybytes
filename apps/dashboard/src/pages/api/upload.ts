// src/pages/api/upload.ts
import type { APIRoute } from 'astro';
import type { InferSchema } from '@groovybytes/schema/src/index.ts';

import { PulsarContext, sendData } from '@groovybytes/sinks/src/ctx.ts'; 
import { MessageSchema } from '@groovybytes/schema/src/index.ts';
import { encodeBase64 } from '@std/encoding';
import { parse } from '@std/csv'; 

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
    const topic = 'ingestion/input'; // Replace with your actual topic

    // Process each file in the form data
    const fileProcessingPromises: Promise<void>[] = [];

    for (const [name, value] of formData.entries()) {
      if (value instanceof File) {
        const file = value;
        console.log(`Processing file: ${file.name}`);

        // Read the file data
        const arrayBuffer = await file.arrayBuffer();
        
        // Encode file data as base64 string
        const fileBase64 = encodeBase64(arrayBuffer);

        // Generate a unique message ID
        const messageId = crypto.randomUUID();

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
          payload: {
            data: fileBase64, 
          },
          meta: {
            traceIds: [messageId],
            data: {
              type: 'file-upload',
              source: file.name,
            },
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          },
        };

        // Validate the message against the schema
        const validationResult = MessageSchema.safeParse(message);

        if (!validationResult.success) {
          console.error('Invalid message:', validationResult.error);
          // Handle validation errors
          continue; // Skip this file
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
