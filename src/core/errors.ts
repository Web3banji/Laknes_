/**
 * LAKNES Domain and Architecture Errors
 * Explicit, typed errors covering business logic, validation, authorization, and infrastructure status.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an operation requires persistent storage or external integration that has not been provisioned.
 * Prevents silent fallback to mock/local storage as required by Part 7.
 */
export class ServiceUnconfiguredError extends AppError {
  public readonly serviceName: string;
  public readonly configurationHelp: string;

  constructor(
    serviceName: string,
    message = `The service '${serviceName}' is not yet configured with a persistent provider.`,
    configurationHelp = `To enable this functionality, provision and configure the appropriate persistent database/provider.`
  ) {
    super(message, 503, 'SERVICE_UNCONFIGURED', { serviceName, configurationHelp });
    this.serviceName = serviceName;
    this.configurationHelp = configurationHelp;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required to access this resource') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resourceName = 'Resource', id?: string) {
    super(
      id ? `${resourceName} with ID '${id}' was not found.` : `${resourceName} was not found.`,
      404,
      'NOT_FOUND',
      { resourceName, id }
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}
