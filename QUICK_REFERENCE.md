# 🛠️ Error Handling & Validation Quick Reference

## Quick Start Checklist

For every new route, follow this pattern:

### 1️⃣ Import Required Dependencies
```typescript
import { Router, Request } from 'express'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { validateResource } from '../middleware/validateResource.js'
import { ok, created } from '../utils/response.js'
```

### 2️⃣ Import or Create Schema
```typescript
// Option A: Use existing schema
import { userSchemas } from '../schemas/user.schema.js'

// Option B: Create inline schema
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})
```

### 3️⃣ Build Route with Validation
```typescript
router.post('/resource',
  authenticateMiddleware, // Auth/permissions
  validateResource(schema, 'body'), // Validation
  asyncHandler(async (req, res) => {
    // Handler code - no try/catch needed!
    const data = req.body
    
    // Check business logic
    if (exists) {
      throw AppError.conflict('Already exists')
    }
    
    // Create/update
    const result = await db.create(data)
    return created(res, result)
  })
)
```

---

## Common Patterns

### ✅ POST - Create with Body Validation
```typescript
router.post('/users',
  validateResource(userSchemas.create, 'body'),
  asyncHandler(async (req, res) => {
    const user = await db.user.create({ data: req.body })
    return created(res, user)
  })
)
```

### ✅ GET - List with Query Pagination
```typescript
router.get('/users',
  validateResource(commonSchemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const users = await db.user.findMany({
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
    })
    return ok(res, users)
  })
)
```

### ✅ GET/:id - Single Item with Param Validation
```typescript
router.get('/users/:id',
  validateResource(commonSchemas.idParam, 'params'),
  asyncHandler(async (req, res) => {
    const user = await db.user.findUnique({
      where: { id: req.params.id }
    })
    if (!user) throw AppError.notFound('User not found')
    return ok(res, user)
  })
)
```

### ✅ PUT/:id - Update with Both Validation
```typescript
router.put('/users/:id',
  validateResource(commonSchemas.idParam, 'params'),
  validateResource(userSchemas.update, 'body'),
  asyncHandler(async (req, res) => {
    const user = await db.user.update({
      where: { id: req.params.id },
      data: req.body
    })
    return ok(res, user)
  })
)
```

### ✅ DELETE/:id - Delete with Param Validation
```typescript
router.delete('/users/:id',
  validateResource(commonSchemas.idParam, 'params'),
  asyncHandler(async (req, res) => {
    await db.user.delete({
      where: { id: req.params.id }
    })
    res.status(204).send()
  })
)
```

---

## Throwing Errors (Use AppError)

```typescript
// Input validation (422 Validation Error)
throw AppError.badRequest('Invalid input', { field: 'email' })

// Unauthorized (401)
throw AppError.unauthorized('Login required')

// Forbidden (403)
throw AppError.forbidden('Admin only')

// Not found (404)
throw AppError.notFound('User not found')

// Conflict (409) - Usually for duplicates
throw AppError.conflict('Email already registered')

// Too many requests (429) - Rate limiting
throw AppError.tooManyRequests('Too many attempts')

// Server error (500)
throw AppError.internal('Database failed')
```

---

## Creating Zod Schemas

### In `src/schemas/resource.schema.ts`:

```typescript
import { z } from 'zod'
import { commonSchemas } from './common.schema.js'

// Create schema
export const createSchema = z.object({
  name: z.string().min(1).max(255),
  email: commonSchemas.email,
  role: commonSchemas.role,
})

export type CreateInput = z.infer<typeof createSchema>

// Update schema (make all fields optional)
export const updateSchema = createSchema.partial()

export type UpdateInput = z.infer<typeof updateSchema>

// ID parameter
export const idParamSchema = z.object({
  id: commonSchemas.uuid,
})

// Query/pagination
export const querySchema = z.object({
  ...commonSchemas.pagination.shape,
  search: z.string().optional(),
})

// Exports object for convenience
export const schemas = {
  create: createSchema,
  update: updateSchema,
  idParam: idParamSchema,
  query: querySchema,
}
```

---

## Common Validation Patterns

### Email
```typescript
email: z.string().email('Invalid email')
```

### Password (Strong)
```typescript
password: commonSchemas.password // 8+, upper, lower, number, special
```

### Name
```typescript
name: commonSchemas.name // 2-255 chars
```

### UUID
```typescript
id: commonSchemas.uuid
```

### Enum
```typescript
role: z.enum(['STUDENT', 'EDITOR', 'ADMIN'])
```

### String with Max Length
```typescript
slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/)
```

### Array
```typescript
tags: z.array(z.string()).min(1).max(10)
```

### Optional
```typescript
description: z.string().optional() // Can be undefined
category: z.enum([...]).nullable() // Can be null
```

### With Default
```typescript
page: z.coerce.number().int().positive().default(1)
```

---

## Error Handling Checklist

- ✅ Never use `res.status().json()` for errors
- ✅ Always throw `AppError.*()` instead
- ✅ Don't catch errors - let errorHandler do it
- ✅ Wrap with `asyncHandler()` to catch promises
- ✅ Add `validateResource()` middleware before handler
- ✅ Log manually only if needed (errorHandler logs errors)
- ✅ Don't expose stack traces (errorHandler hides them)
- ✅ Use descriptive error messages

---

## Useful Response Functions

```typescript
import { ok, created, noContent, badRequest, forbidden, notFound, serverError, paginate } from '../utils/response.js'

// Success responses
ok(res, { data })          // 200 OK
created(res, { data })     // 201 Created
noContent(res)             // 204 No Content

// Error responses (use AppError instead!)
paginate(res, items, total, page, limit) // 200 with meta

// Direct error (rarely needed)
badRequest(res, 'Invalid input')
forbidden(res, 'Not authorized')
notFound(res, 'Not found')
serverError(res, 'Something failed')
```

---

## Testing Error Cases

```typescript
import { describe, it, expect } from 'vitest'

describe('User routes', () => {
  it('should reject duplicate email', async () => {
    const res = await post('/users', {
      email: 'test@example.com',
      name: 'Test'
    })
    
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('ALREADY_EXISTS')
  })

  it('should reject invalid email', async () => {
    const res = await post('/users', {
      email: 'not-an-email',
      name: 'Test'
    })
    
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('should reject missing required field', async () => {
    const res = await post('/users', {
      email: 'test@example.com'
      // missing name
    })
    
    expect(res.status).toBe(400)
    expect(res.body.error.details).toBeDefined()
  })
})
```

---

## Debugging

### Enable Verbose Logging
Set in `.env`:
```
NODE_ENV=development
LOG_LEVEL=debug
```

### Check Error Handler Logs
Look in console for:
```
[ERROR] Prisma Error: { code: 'P2002', meta: {...} }
[WARN] Validation Error: { details: {...} }
[ERROR] Unhandled Error: { error: 'Message', stack: '...' }
```

### Test Route with cURL
```bash
# Valid request
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com"}'

# Invalid request (missing field)
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John"}'

# Duplicate (triggers P2002)
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com"}'
```

---

## Summary of Files

| File | Purpose |
|------|---------|
| `src/utils/AppError.ts` | Error class with factory methods |
| `src/middleware/errorHandler.ts` | Global error handler + asyncHandler |
| `src/middleware/validateResource.ts` | Zod validation middleware |
| `src/schemas/common.schema.ts` | Reusable validation schemas |
| `src/schemas/topic.schema.ts` | Topic-specific schemas |
| `src/schemas/resource.schema.ts` | Template for new schemas |

---

**For detailed examples, see**: `src/middleware/ERROR_HANDLING_GUIDE.ts`
