import { runIngestionInputSink } from "@groovybytes/sinks/src/input/ingestion.ts";
import { runIngestionOutputSink } from "@groovybytes/sinks/src/output/ingestion.ts";
import { execa } from 'execa';

async function runInputSink() {
  try {
    console.log(`Running Input Ingestion Sink`);
    await runIngestionInputSink();
    console.log('Output.');
  } catch (error) {
    console.error('Error executing Input Ingestion Sink:', error);
  }
}

async function runOutputSink() {
  try {
    console.log(`Running Output Ingestion Sink`);
    await runIngestionOutputSink();
    console.log('Output.');
  } catch (error) {
    console.error('Error executing Output Ingestion Sink:', error);
  }
}

async function runSystem(pyFilePath = 'main.py') {
  try {
    console.log(`Running Python System: ${pyFilePath}`);
    const { stdout } = await execa('python', [pyFilePath]);
    console.log('Output:', stdout);
  } catch (error) {
    console.error('Error executing Python file:', error);
  }
}

// Example usage:
(async () => {
  await Promise.all([
    runSystem(),
    runOutputSink(),
    runInputSink(),
  ]);
})();
