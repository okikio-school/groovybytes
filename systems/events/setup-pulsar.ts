#!/usr/bin/env -S pnpm tsx
import { execa } from 'execa';

// Pulsar Admin REST API URL
const PULSAR_ADMIN_URL = 'http://localhost:8080/admin/v2';

// Namespaces and Topics Configuration
const NAMESPACES_TOPICS = {
  ingestion: ['input/json:3', 'input/csv:3', 'input/xml:3', 'output:3'],
  formatting: ['input:3', 'output:3'],
  analysis: ['input:3', 'output:3'],
  logging: ['system:1'],
  notifications: ['alerts:1'],
  errors: ['system:1'],
};

// Helper: Check if Pulsar is Ready
const isPulsarReady = async () => {
  try {
    const response = await fetch(`${PULSAR_ADMIN_URL}/clusters`);
    return response.ok;
  } catch {
    return false;
  }
};

// Helper: Wait for Pulsar to be Ready
const waitForPulsar = async () => {
  console.log('Waiting for Pulsar to be ready...');
  while (!(await isPulsarReady())) {
    console.log('Pulsar is not ready yet. Retrying in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  console.log('Pulsar is ready!');
};

// Helper: Create a Namespace
const createNamespace = async (namespace: string) => {
  const url = `${PULSAR_ADMIN_URL}/namespaces/public/${namespace}`;
  const response = await fetch(url, { method: 'PUT' });
  if (response.ok) {
    console.log(`Created namespace: ${namespace}`);
  } else {
    const error = await response.text();
    console.error(`Failed to create namespace ${namespace}: ${error}`);
  }
};

// Helper: Create a Topic
const createTopic = async (namespace: string, topic: string, partitions: number) => {
  const url = `${PULSAR_ADMIN_URL}/persistent/public/${namespace}/${topic}/partitions`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partitions),
  });
  if (response.ok) {
    console.log(`Created topic: public/${namespace}/${topic} with ${partitions} partitions`);
  } else {
    const error = await response.text();
    console.error(`Failed to create topic ${namespace}/${topic}: ${error}`);
  }
};

// Main Function
const setupPulsar = async () => {
  try {
    console.log('Starting Pulsar with Docker Compose...');
    await execa('docker-compose', ['up', '-d']);

    // Wait for Pulsar to be ready
    await waitForPulsar();

    // Create namespaces and topics
    for (const [namespace, topics] of Object.entries(NAMESPACES_TOPICS)) {
      await createNamespace(namespace);
      for (const topicData of topics) {
        const [topic, partitions] = topicData.split(':');
        await createTopic(namespace, topic, parseInt(partitions, 10));
      }
    }

    console.log('Pulsar setup complete!');
  } catch (error) {
    console.error('Error during Pulsar setup:', error);
  }
};

// Run the setup
setupPulsar();
