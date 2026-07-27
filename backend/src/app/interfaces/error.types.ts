export interface TErrorSource {
  path: string;
  message: string;
}

export interface TGenericErrorResponse {
  statusCode: number;
  message: string;
  errorSources: TErrorSource[];
}
