export class DomainValidationError extends Error {
  public readonly errors: { field: string; message: string }[];
  constructor(errors: { field: string; message: string }[]) {
    super('Validation failed');
    this.errors = errors;
  }
}
