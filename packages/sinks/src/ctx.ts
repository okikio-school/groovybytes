import Pulsar from 'pulsar-client';

/**
 * Manages Pulsar client connections, producers, and consumers.
 * Implements the AsyncDisposable interface for proper resource management.
 */
export class PulsarContext implements AsyncDisposable {
  #client: Pulsar.Client;
  #producers = new Map<string, Pulsar.Producer>();
  #consumers = new Map<string, Pulsar.Consumer>();
  #serviceUrl = "pulsar://localhost:6650";

  /**
   * Creates a new PulsarContext instance.
   * @param serviceUrl - The URL of the Pulsar service.
   */
  constructor(serviceUrl?: string) {
    if (serviceUrl) this.#serviceUrl = serviceUrl;
    this.#client = new Pulsar.Client({ serviceUrl: this.#serviceUrl });
  }

  /**
   * Gets the URL of the Pulsar service.
   * @returns The URL of the Pulsar service.
   */
  getServiceUrl(): string {
    return this.#serviceUrl;
  }

  /**
   * Retrieves an existing producer or creates a new one for the given topic.
   * @param topic - The topic name.
   * @returns A Promise that resolves to a Pulsar producer.
   */
  async getProducer(topic: string): Promise<Pulsar.Producer> {
    let producer = this.#producers.get(topic);
    if (!producer) {
      producer = await this.#client.createProducer({ topic });
      this.#producers.set(topic, producer);
    }
    return producer;
  }

  /**
   * Retrieves an existing consumer or creates a new one for the given topic and subscription.
   * @param topic - The topic name.
   * @param subscription - The subscription name.
   * @returns A Promise that resolves to a Pulsar consumer.
   */
  async getConsumer(
    topic: string,
    subscription: string,
  ): Promise<Pulsar.Consumer> {
    const key = `${topic}:${subscription}`;
    let consumer = this.#consumers.get(key);
    if (!consumer) {
      consumer = await this.#client.subscribe({
        topic,
        subscription,
        subscriptionType: "Shared",
      });
      this.#consumers.set(key, consumer);
    }
    return consumer;
  }

  /**
   * Asynchronous disposal method for resource cleanup.
   * Automatically called when using the `await using` syntax.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  /**
   * Closes all producers, consumers, and the client connection.
   * @returns A Promise that resolves when all resources are closed.
   */
  async close(): Promise<void> {
    // Close all producers
    for (const producer of this.#producers.values()) {
      await producer.close();
    }
    this.#producers.clear(); // Clear the map after closing producers

    // Close all consumers
    for (const consumer of this.#consumers.values()) {
      await consumer.close();
    }
    this.#consumers.clear(); // Clear the map after closing consumers

    // Close the client connection
    await this.#client.close();
  }
}
/**
 * Sends data to a specified Pulsar topic.
 *
 * @param context - The Pulsar context used to interact with the Pulsar broker.
 * @param topic - The topic to which the data will be sent.
 * @param data - The data to be sent. This can be any JSON-serializable object.
 *
 * @example
 * ```ts
 * const context = new PulsarContext(); // Assume this is already initialized.
 * const topic = "my-topic";
 * const data = { key: "value" };
 * await sendData(context, topic, data);
 * console.log("Data sent successfully!");
 * ```
 */
export async function sendData(context: PulsarContext, topic: string, data: any): Promise<void> {
  // Get a producer for the specified topic from the Pulsar context
  const producer = await context.getProducer(topic);

  // Encode the data as a UTF-8 string and send it as a message to the topic
  await producer.send({
    // @ts-ignore - The Pulsar client types expect a Buffer, but we're using a Uint8Array
    data: new TextEncoder().encode(JSON.stringify(data)),
  });

  // Log that the data was successfully sent
  console.log(`Sent data to topic: ${topic}`);
}

/**
 * Creates an async iterator to consume messages from a specified Pulsar topic.
 *
 * @param context - The Pulsar context used to interact with the Pulsar broker.
 * @param topic - The topic from which data will be consumed.
 * @param subscription - The subscription name to be used for consuming messages.
 *
 * @returns An async iterator that yields parsed message data.
 *
 * @example
 * ```ts
 * const context = new PulsarContext(); // Assume this is already initialized.
 * const topic = "my-topic";
 * const subscription = "my-subscription";
 *
 * for await (const data of receiveDataIterator(context, topic, subscription)) {
 *   console.log("Received data:", data);
 * }
 * ```
 */
export async function* receiveDataIterator<T>(
  context: PulsarContext,
  topic: string,
  subscription: string
): AsyncGenerator<T, void, unknown> {
  // Get a consumer for the specified topic and subscription from the Pulsar context
  const consumer = await context.getConsumer(topic, subscription);

  try {
    while (true) {
      // Receive a message from the consumer
      const msg = await consumer.receive();

      // Parse the message data from the received message
      const data = JSON.parse(msg.getData().toString());

      // Yield the parsed data to the iterator consumer
      yield data;

      // Acknowledge the message to indicate successful processing
      consumer.acknowledge(msg);
    }
  } catch (error) {
    console.error("Error receiving data:", error);
  } finally {
    // Close the consumer to release resources when done
    await consumer.close();
  }
}

/**
 * Helper function to handle iterator weaknesses by adding a timeout for inactivity.
 * This ensures that the iterator doesn't hang indefinitely.
 *
 * @param iterator - The async iterator to monitor.
 * @param timeoutMs - Timeout in milliseconds to wait before throwing an error.
 * @param errorOut - Whether to throw an error when the timeout is exceeded.
 *
 * @returns A wrapped async iterator that respects the timeout.
 *
 * @example
 * ```ts
 * const context = new PulsarContext();
 * const topic = "my-topic";
 * const subscription = "my-subscription";
 *
 * const iterator = withTimeout(receiveDataIterator(context, topic, subscription), 5000);
 *
 * for await (const data of iterator) {
 *   console.log("Received data:", data);
 * }
 * ```
 */
export async function* withTimeout<T>(
  iterator: AsyncGenerator<T>,
  timeoutMs: number,
  errorOut: boolean = false
): AsyncGenerator<T> {
  while (true) {
    const next = Promise.race([
      iterator.next(),
      timeout(timeoutMs)
    ]);

    const result = await next;
    if (result instanceof Error) {
      if (errorOut) throw result;
      else break;
    }

    if (result?.done) {
      return;
    }

    yield result.value;
  }
}

/**
 * Helper function to create a timeout promise.
 *
 * @param ms - Timeout in milliseconds.
 *
 * @returns A promise that resolves with an error after the specified timeout.
 */
export function timeout(ms: number) {
  return new Promise<Error>((resolve) => {
    return setTimeout(resolve, ms, new Error("Timeout exceeded"))
  });
}