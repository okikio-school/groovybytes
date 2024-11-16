import { z } from "zod";

/**
 * Zod schema for validating literal values.
 */
export const LiteralValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/**
 * Type representing the value of a literal type.
 */
export type LiteralValueType = z.infer<typeof LiteralValueSchema>;

/**
 * Type representing a JSON object.
 */
export type JsonType = LiteralValueType | { [key: PropertyKey]: JsonType } | JsonType[];

/**
 * JSON schema that supports nested objects and arrays.
 */
export const JSONSchema: z.ZodType<JsonType> = z.lazy(() =>
  z.union([
    LiteralValueSchema,
    z.array(JSONSchema),
    z.record(JSONSchema)
  ])
);