
const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

let memoryCsrfToken: string | null = null;

export function setMemoryCsrfToken(token: string | null): void {
  memoryCsrfToken = token;
}

export function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: T[] }).results;
  }

  return [];
}

export class ApiError extends Error {
  status: number;
  data: any;
  code?: string;

  constructor(
    status: number,
    message: string,
    data?: any,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = code;
  }
}

function getCsrfToken(): string | null {
  if (memoryCsrfToken) {
    return memoryCsrfToken;
  }

  if (typeof document !== "undefined") {
    const cookie = document.cookie
      .split("; ")
      .find((item) => item.startsWith("csrftoken="));

    if (cookie) {
      return decodeURIComponent(cookie.split("=")[1]);
    }
  }

  return null;
}

export async function getCsrfCookie(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && memoryCsrfToken) {
    return memoryCsrfToken;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/auth/csrf/?_t=${Date.now()}`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("CSRF token could not be obtained.");
  }

  try {
    const data = await response.json();
    if (data && typeof data.csrfToken === "string" && data.csrfToken) {
      memoryCsrfToken = data.csrfToken;
      return data.csrfToken;
    }
  } catch {
    // If not JSON or no token field, fallback to cookie
  }

  return getCsrfToken();
}

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  if (options.body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const unsafeMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (unsafeMethods.includes(method)) {
    let csrfToken = getCsrfToken();
    if (!csrfToken) {
      csrfToken = await getCsrfCookie();
    }

    if (!csrfToken) {
      csrfToken = getCsrfToken();
    }

    if (!csrfToken) {
      throw new Error("CSRF token is not available.");
    }

    headers["X-CSRFToken"] = csrfToken;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      method,
      headers,
      credentials: "include",
      ...(options.body !== undefined
        ? {
            body: isFormData
              ? (options.body as FormData)
              : JSON.stringify(options.body),
          }
        : {}),
    },
  );

  if (!response.ok) {
    let parsedData: any = null;
    let detailMessage = "";
    let code: string | undefined;
    let responseText = "";

    try {
      responseText = await response.text();

      try {
        parsedData = JSON.parse(responseText);

        if (
          typeof parsedData === "object" &&
          parsedData !== null
        ) {
          code = parsedData.code;

          if (typeof parsedData.detail === "string") {
            detailMessage = parsedData.detail;
          } else if (
            typeof parsedData.error === "string"
          ) {
            detailMessage = parsedData.error;
          } else if (
            typeof parsedData.message === "string"
          ) {
            detailMessage = parsedData.message;
          } else {
            const firstKey = Object.keys(parsedData)[0];
            const value = parsedData[firstKey];

            if (Array.isArray(value) && value.length > 0) {
              detailMessage = String(value[0]);
            } else if (typeof value === "string") {
              detailMessage = value;
            }
          }
        }
      } catch {
        detailMessage = responseText;
      }
    } catch {
      detailMessage = response.statusText;
    }

    // Auto-retry on CSRF rotation/mismatch
    if (
      response.status === 403 &&
      (detailMessage.toLowerCase().includes("csrf") ||
        responseText.toLowerCase().includes("csrf"))
    ) {
      try {
        const freshCsrf = await getCsrfCookie(true);
        if (freshCsrf) {
          headers["X-CSRFToken"] = freshCsrf;
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            credentials: "include",
            ...(options.body !== undefined
              ? {
                  body: isFormData
                    ? (options.body as FormData)
                    : JSON.stringify(options.body),
                }
              : {}),
          });

          if (retryResponse.ok) {
            if (retryResponse.status === 204) {
              return undefined as T;
            }
            const retryJson = (await retryResponse.json()) as T;
            if (
              retryJson &&
              typeof retryJson === "object" &&
              "csrfToken" in retryJson &&
              typeof (retryJson as { csrfToken: unknown }).csrfToken === "string"
            ) {
              memoryCsrfToken = (retryJson as { csrfToken: string }).csrfToken;
            }
            return retryJson;
          }
        }
      } catch {
        // Fall through to throw ApiError
      }
    }

    throw new ApiError(
      response.status,
      detailMessage ||
        response.statusText ||
        `Request failed with status ${response.status}`,
      parsedData,
      code,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const jsonResult = (await response.json()) as T;
  if (
    jsonResult &&
    typeof jsonResult === "object" &&
    "csrfToken" in jsonResult &&
    typeof (jsonResult as { csrfToken: unknown }).csrfToken === "string"
  ) {
    memoryCsrfToken = (jsonResult as { csrfToken: string }).csrfToken;
  }
  return jsonResult;
}

// ======================================================
// Owner QR profile API
// Backend: /api/billing/qr/
// ======================================================

export interface OwnerQrProfileApi {
  id: number;
  label: string;
  payee_name: string;
  upi_id: string;
  qr_image_data_url: string;
  property_name: string;
  created_at: string;
  updated_at: string;
}

export interface OwnerQrProfileInput {
  label: string;
  payee_name: string;
  upi_id: string;
  qr_image_data_url: string;
  property_name?: string;
}

export async function getOwnerQrProfiles(): Promise<
  OwnerQrProfileApi[]
> {
  const data = await apiRequest<
    OwnerQrProfileApi[] | { results: OwnerQrProfileApi[] }
  >("/api/billing/qr/");

  return asArray<OwnerQrProfileApi>(data);
}

export async function createOwnerQrProfile(
  payload: OwnerQrProfileInput,
): Promise<OwnerQrProfileApi> {
  return apiRequest<OwnerQrProfileApi>(
    "/api/billing/qr/",
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function updateOwnerQrProfile(
  id: string | number,
  payload: Partial<OwnerQrProfileInput>,
): Promise<OwnerQrProfileApi> {
  return apiRequest<OwnerQrProfileApi>(
    `/api/billing/qr/${id}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function deleteOwnerQrProfile(
  id: string | number,
): Promise<void> {
  await apiRequest<void>(
    `/api/billing/qr/${id}/`,
    { method: "DELETE" },
  );
}

// ======================================================
// Tenant-wise QR assignment API
// Backend: /api/billing/tenant-qr-assignments/
// ======================================================

export interface TenantQrAssignmentApi {
  id: number;
  tenant_id: number;
  qr_config: number;
  qr_config_details?: OwnerQrProfileApi;
  created_at: string;
  updated_at: string;
}

export interface TenantQrAssignmentInput {
  tenant_id: number;
  qr_config: number;
}

export async function getTenantQrAssignments(
  tenantId?: string | number,
): Promise<TenantQrAssignmentApi[]> {
  const query = tenantId !== undefined
    ? `?tenant_id=${encodeURIComponent(String(tenantId))}`
    : "";

  const data = await apiRequest<
    TenantQrAssignmentApi[] |
    { results: TenantQrAssignmentApi[] }
  >(`/api/billing/tenant-qr-assignments/${query}`);

  return asArray<TenantQrAssignmentApi>(data);
}

export async function assignQrToTenant(
  payload: TenantQrAssignmentInput,
): Promise<TenantQrAssignmentApi> {
  return apiRequest<TenantQrAssignmentApi>(
    "/api/billing/tenant-qr-assignments/",
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function updateTenantQrAssignment(
  assignmentId: string | number,
  payload: Partial<TenantQrAssignmentInput>,
): Promise<TenantQrAssignmentApi> {
  return apiRequest<TenantQrAssignmentApi>(
    `/api/billing/tenant-qr-assignments/${assignmentId}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function deleteTenantQrAssignment(
  assignmentId: string | number,
): Promise<void> {
  await apiRequest<void>(
    `/api/billing/tenant-qr-assignments/${assignmentId}/`,
    { method: "DELETE" },
  );
}
