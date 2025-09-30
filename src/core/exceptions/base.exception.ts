export class BaseError extends Error {
  public readonly message: string;
  public readonly code: string;
  public readonly statusCode: number;
  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}
