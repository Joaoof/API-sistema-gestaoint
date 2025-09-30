/* eslint-disable no-unused-vars */

export interface LoggerService {
  log(message: string): void;
  warn(message: string): void;
  error(message: string, stack?: string): void;
}
