/**
 * The only error type services should throw.
 *
 * A bare `new Error(...)` falls through to the 500 branch of the global error
 * handler, which turns a predictable bad input into a server error — exactly
 * what Section 4.2 of the assignment forbids. Always throw AppError with a
 * deliberate status code.
 */
export class AppError extends Error {
  public statusCode: number;
  public errorSources?: { path: string; message: string }[];

  constructor(
    statusCode: number,
    message: string,
    errorSources?: { path: string; message: string }[],
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorSources = errorSources;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
