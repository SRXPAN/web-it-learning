/**
 * Zod Validation Middleware
 * Validates request body, query parameters, and route parameters
 */
import { Request, Response, NextFunction } from 'express'
import { ZodSchema, AnyZodObject, z } from 'zod'
import { AppError } from '../utils/AppError.js'

/**
 * Validates request data against a Zod schema
 * @param schema - Zod schema to validate against
 * @param source - What to validate: 'body', 'query', 'params', or object with multiple sources
 * @returns Express middleware function
 *
 * @example
 * // Validate request body
 * router.post('/topics', validateResource(createTopicSchema, 'body'), handler)
 *
 * @example
 * // Validate multiple sources
 * router.put('/topics/:id', validateResource(updateTopicSchema, {
 *   body: createTopicSchema,
 *   params: z.object({ id: z.string().uuid() })
 * }), handler)
 */
export function validateResource(
  schema: ZodSchema | AnyZodObject,
  source: 'body' | 'query' | 'params' | { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema } =
    'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Determine sources to validate
      const sources: Record<string, ZodSchema> = {}

      if (typeof source === 'string') {
        sources[source] = schema
      } else {
        if (source.body) sources.body = source.body
        if (source.query) sources.query = source.query
        if (source.params) sources.params = source.params
      }

      // Validate each source
      const errors: Record<string, unknown> = {}

      for (const [sourceName, sourcePath] of Object.entries(sources)) {
        const data = req[sourceName as keyof Request]
        const result = (sourcePath as AnyZodObject).safeParse(data)

        if (!result.success) {
          errors[sourceName] = result.error.flatten().fieldErrors
        }
      }

      // If validation failed, throw AppError
      if (Object.keys(errors).length > 0) {
        throw AppError.badRequest('Validation failed', errors)
      }

      // Validation passed, attach parsed data to request for convenience
      if (typeof source === 'string') {
        const result = (schema as AnyZodObject).safeParse(req[source as keyof Request])
        if (result.success) {
          (req as any)[`${source}Parsed`] = result.data
        }
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Type-safe request with parsed data
 * @example
 * interface ValidatedRequest extends Request {
 *   bodyParsed?: CreateTopicInput
 *   queryParsed?: PaginationInput
 *   paramsParsed?: { id: string }
 * }
 */
export type ValidatedRequest<T = any> = Request & {
  bodyParsed?: T
  queryParsed?: T
  paramsParsed?: T
}
