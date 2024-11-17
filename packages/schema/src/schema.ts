import { z } from "zod";
import { JSONSchema } from "./utils";

/**
 * Helper function to create Zod enums dynamically from an object.
 * Ensures type safety and prevents manual tuple specification.
 *
 * @param enumObject - An object representing the enum values.
 * @returns A Zod enum schema dynamically generated from the object values.
 * @example
 * const MessageTypeSchema = createEnum(MessageType);
 */
function createEnum<T extends Record<string, string>>(enumObject: T) {
  const values = Object.values(enumObject) as [T[keyof T], ...T[keyof T][]];
  return z.enum(values);
}

/**
 * Enum representing the types of messages supported by the system.
 * Includes `data`, `status`, `event`, and `log`.
 */
export const MessageType = {
  DATA: "data",
  STATUS: "status",
  EVENT: "event",
  LOG: "log",
} as const;

/**
 * Zod schema for validating message types.
 */
export const MessageTypeSchema = createEnum(MessageType);

/**
 * Enum representing the priority levels for messages.
 * Includes `low`, `normal`, `high`, and `critical`.
 */
export const PriorityLevel = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

/**
 * Zod schema for validating priority levels.
 */
export const PriorityLevelSchema = createEnum(PriorityLevel);

/**
 * Schema for retry metadata, used to track retry attempts and limits.
 */
export const RetryMetadataSchema = z.object({
  maxRetries: z.number(), // Maximum retries allowed
  remainingRetries: z.number(), // Remaining retries available
});

/**
 * Schema for error details, used to capture information about the last error.
 */
export const ErrorDetailsSchema = z.object({
  lastError: z.string(), // Error message description
  lastErrorTimestamp: z.number(), // Timestamp of the last error occurrence
});

/**
 * Schema for trace metadata, used to track the trace IDs for a message.
 */
export const TraceMetadataSchema = z.object({
  traceIds: z.array(z.string()), // Array of trace IDs
});

/**
 * Schema for file-specific metadata, used to handle file-related messages.
 */
export const FileMetadataSchema = z.object({
  fileName: z.string().optional(), // Name of the file
  fileType: z.string().optional(), // MIME type of the file
  fileSize: z.number().optional(), // Size of the file in bytes
  chunkId: z.number().optional(), // Chunk ID for file streaming
  chunkSize: z.number().optional(), // Size of the chunk in bytes
  totalChunks: z.number().optional(), // Total number of chunks in the file
});

/**
 * Schema for TTL (time-to-live) metadata, used to enforce message expiration.
 */
export const TTLMetadataSchema = z.object({
  ttl: z.number(), // Time-to-live in milliseconds
  expiryTimestamp: z.number(), // Expiry timestamp in Unix epoch format
});

/**
 * Schema for data source metadata, used to identify the data source of a message.
 */
// Metadata schema to handle source and format details
export const DataSourceMetadataSchema = z.object({
  format: z.enum(['json', 'csv', 'xml', 'binary', 'text']), // Data format
  sourceType: z.enum(['sql', 'nosql', 'filesystem', 'mqtt', 'http']), // Data source type
  sourceId: z.string().optional(), // Unique identifier for the source
  compression: z.enum(['none', 'gzip', 'zstd']).optional(), // Compression type
  encryption: z.enum(['none', 'aes-256', 'rsa']).optional(), // Encryption type
  checksum: z.enum(['none', 'crc32', 'md5', 'sha256']).optional(), // Checksum type
});

/**
 * Combined metadata schema including traceability, file, TTL, and data source metadata.
 */
export const MetadataSchema = TraceMetadataSchema.merge(FileMetadataSchema)
  .merge(TTLMetadataSchema.partial())
  .extend({
    source: DataSourceMetadataSchema.optional(), // Data source metadata
    retry: RetryMetadataSchema.optional(), // Retry metadata
    errorDetails: ErrorDetailsSchema.optional(), // Error details metadata
    throughput: z.number().optional(), // Data throughput in KB/sec
    latency: z.number().optional(), // Delivery latency in milliseconds
    priority: PriorityLevelSchema.optional(), // Priority level of the message
  });

// Example payload for JSON data
export const JsonPayloadSchema = z.object({
  data: JSONSchema, // Key-value pairs
});

// Example payload for CSV data
export const CsvPayloadSchema = z.object({
  rows: z.array(JSONSchema), // Array of rows with string key-value pairs
});

export const XmlPayloadSchema = z.object({
  data: z.string(), // XML data as a string
});

export const BinaryPayloadSchema = z.object({
  data: z.string(), // Base64-encoded binary data
});

export const TextPayloadSchema = z.object({
  data: z.string(), // Text data as a string
});

/**
 * Schema for data payloads, used for structured or base64-encoded data.
 */
export const DataPayloadSchema = z.union([
  // Add other payload schemas (XML, binary, etc.)
  // Supports structured data or base64 strings
  JsonPayloadSchema,
  CsvPayloadSchema,
  XmlPayloadSchema,
  BinaryPayloadSchema,
  TextPayloadSchema,
]);

/**
 * Schema for status payloads, used to communicate system health or status.
 */
export const StatusPayloadSchema = z.object({
  status: z.string(), // Status description
});

/**
 * Schema for event payloads, used to trigger actions or signal events.
 */
export const EventPayloadSchema = z.object({
  event: z.object({
    type: z.string(), // Type of the event (e.g., "backpressure")
    action: z.string().optional(), // Action associated with the event
    reason: z.string().optional(), // Reason for the event
    details: z.string().optional(), // Additional details about the event
  }),
});

/**
 * Schema for log payloads, used for storing logs.
 */
export const LogPayloadSchema = z.object({
  log: z.string(), // Log message content
});

/**
 * Unified schema for all payload types, including data, status, event, and log payloads.
 */
export const PayloadSchema = z.union([
  DataPayloadSchema,
  StatusPayloadSchema,
  EventPayloadSchema,
  LogPayloadSchema,
]);

/**
 * Schema for the message header, containing identification and metadata for routing.
 */
export const HeaderSchema = z.object({
  messageId: z.string(), // Unique message identifier
  source: z.string(), // Source of the message
  destination: z.string(), // Destination of the message
  timestamp: z.number(), // Timestamp of the message
  type: MessageTypeSchema, // Type of the message
  protocolVersion: z.string(), // Protocol version for compatibility
});

/**
 * Complete schema for a message, combining the header, payload, and metadata.
 */
export const MessageSchema = z.object({
  header: HeaderSchema, // Header schema
  payload: PayloadSchema, // Payload schema
  meta: MetadataSchema, // Metadata schema
});

/**
 * Type alias for the inferred type of a Zod schema.
 */
export type InferSchema<T extends z.ZodType<any, any>> = z.infer<T>;

/**
 * Type alias for the inferred type of a message schema.
 */
export { z as Zod };