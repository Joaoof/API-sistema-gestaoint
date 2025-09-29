export class DomainValidationError extends Error {
  constructor(public readonly errors: { field: string; message: string }[]) {
    super('Validation failed');
  }
}
