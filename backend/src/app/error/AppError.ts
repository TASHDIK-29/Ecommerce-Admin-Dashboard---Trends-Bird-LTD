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
