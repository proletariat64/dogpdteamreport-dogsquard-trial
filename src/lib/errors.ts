export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super("RESOURCE_NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("UNIQUE_VIOLATION", message, 409);
    this.name = "ConflictError";
  }
}

export class LockedError extends AppError {
  constructor(message: string, details?: unknown) {
    super("RESOURCE_LOCKED", message, 423, details);
    this.name = "LockedError";
  }
}
