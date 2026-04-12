export class ServiceError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.status = status
  }
}

export class NotFoundError extends ServiceError {
  constructor(message = 'Not found') {
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends ServiceError {
  readonly issues?: unknown

  constructor(message = 'Validation failed', issues?: unknown) {
    super(message, 'VALIDATION', 400)
    this.name = 'ValidationError'
    this.issues = issues
  }
}

export class ConflictError extends ServiceError {
  constructor(message = 'Conflict') {
    super(message, 'CONFLICT', 409)
    this.name = 'ConflictError'
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}
