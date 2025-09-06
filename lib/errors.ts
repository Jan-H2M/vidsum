export class VidSumError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'VidSumError'
  }
}

export class ValidationError extends VidSumError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}

export class NotFoundError extends VidSumError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404)
  }
}

export class ProcessingError extends VidSumError {
  constructor(message: string, step?: string) {
    super(
      step ? `Error in ${step}: ${message}` : message, 
      'PROCESSING_ERROR', 
      500
    )
  }
}

export class ExternalServiceError extends VidSumError {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502)
  }
}

export function handleApiError(error: unknown) {
  console.error('API Error:', error)
  
  if (error instanceof VidSumError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode
    }
  }
  
  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'UNKNOWN_ERROR',
      statusCode: 500
    }
  }
  
  return {
    error: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500
  }
}