import { runFormattingInputSink } from "@groovybytes/sinks/src/input/formatting.ts";
import { runFormattingOutputSink } from "@groovybytes/sinks/src/output/formatting.ts";
import { execa } from 'execa';

async function runInputSink() {
  try {
    console.log(`Running Input Formatting Sink`);
    await runFormattingInputSink();
    console.log('Output.');
  } catch (error) {
    console.error('Error executing Input Formatting Sink', error);
  }
}

async function runOutputSink() {
  try {
    console.log(`Running Output Formatting Sink`);
    await runFormattingOutputSink();
    console.log('Output.');
  } catch (error) {
    console.error('Error executing Output Formatting Sink', error);
  }
}

async function runSystem(pyFilePath = 'server.py') {
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
