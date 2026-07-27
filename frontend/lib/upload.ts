import { api, API_URL, ApiError, readCookie } from "./api-client";
import type { ApiEnvelope } from "./types";

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

const parseError = (xhr: XMLHttpRequest): ApiError => {
  try {
    const body = JSON.parse(xhr.responseText);
    return new ApiError(
      body?.statusCode ?? xhr.status,
      body?.message ?? "Upload failed.",
      Array.isArray(body?.errorSources) ? body.errorSources : [],
    );
  } catch {
    if (xhr.status === 413) {
      return new ApiError(413, "That file is too large for the server to accept.");
    }
    return new ApiError(xhr.status || 0, "Upload failed. Check your connection and try again.");
  }
};

const sendUpload = <T>(files: File[], onProgress?: (p: UploadProgress) => void): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const form = new FormData();
    for (const file of files) form.append("files", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/media/upload`);
    // The dashboard authenticates with cookies, so the request must carry them
    // and echo the CSRF token, exactly as the fetch client does.
    xhr.withCredentials = true;

    const csrf = readCookie("csrfToken");
    if (csrf) xhr.setRequestHeader("X-CSRF-Token", csrf);

    // fetch() cannot report upload progress, which Section 6.1 asks for, so this
    // one request uses XHR.
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const envelope = JSON.parse(xhr.responseText) as ApiEnvelope<T>;
          resolve(envelope.data);
        } catch {
          reject(new ApiError(0, "The server returned an unreadable response."));
        }
        return;
      }
      reject(parseError(xhr));
    };

    xhr.onerror = () =>
      reject(new ApiError(0, "Cannot reach the server. Check that the API is running."));
    xhr.onabort = () => reject(new ApiError(0, "Upload cancelled."));

    xhr.send(form);
  });

/**
 * Uploads with progress, retrying once through the shared refresh path if the
 * access token expired mid-session.
 */
export const uploadMedia = async <T>(
  files: File[],
  onProgress?: (progress: UploadProgress) => void,
): Promise<T> => {
  try {
    return await sendUpload<T>(files, onProgress);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      // Any authenticated call routes through the api client's single-flight
      // refresh, so this both refreshes and confirms the session is usable.
      await api.get("/auth/session");
      return await sendUpload<T>(files, onProgress);
    }
    throw error;
  }
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
