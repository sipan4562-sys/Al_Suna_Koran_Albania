import type {
  ChatMessageDTO,
  ConversationDTO,
  MemoryDTO,
  ProfileSettings,
  SystemStatus,
} from "@/lib/shared/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Keine Verbindung zum JARVIS-Server.", 0, "network");
  }
  if (response.status === 401) {
    redirectToLogin();
    throw new ApiError("Bitte melde dich an.", 401, "unauthorized");
  }
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

export async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    return new ApiError(
      body.error?.message ?? `Fehler ${response.status}`,
      response.status,
      body.error?.code ?? "error",
    );
  } catch {
    return new ApiError(`Fehler ${response.status}`, response.status, "error");
  }
}

export function redirectToLogin() {
  if (typeof window === "undefined" || window.location.pathname === "/login") return;
  const next = window.location.pathname + window.location.search;
  const target = new URL("/login", window.location.origin);
  if (next && next !== "/") target.searchParams.set("next", next);
  window.location.assign(target); // bewusst harte Navigation (frische Sitzung)
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const api = {
  status: () => request<SystemStatus>("/api/status"),
  profile: () => request<{ profile: ProfileSettings }>("/api/profile").then((r) => r.profile),
  updateProfile: (patch: Partial<ProfileSettings>) =>
    request<{ profile: ProfileSettings }>("/api/profile", { method: "PUT", ...json(patch) }).then((r) => r.profile),
  conversations: () =>
    request<{ conversations: ConversationDTO[] }>("/api/conversations").then((r) => r.conversations),
  conversation: (id: string) =>
    request<{ conversation: { id: string; title: string }; messages: ChatMessageDTO[] }>(
      `/api/conversations/${encodeURIComponent(id)}`,
    ),
  renameConversation: (id: string, title: string) =>
    request<{ ok: true }>(`/api/conversations/${encodeURIComponent(id)}`, { method: "PATCH", ...json({ title }) }),
  deleteConversation: (id: string) =>
    request<{ ok: true }>(`/api/conversations/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deleteAllConversations: () => request<{ deleted: number }>("/api/conversations", { method: "DELETE" }),
  memories: () => request<{ memories: MemoryDTO[] }>("/api/memories").then((r) => r.memories),
  addMemory: (content: string) =>
    request<{ memory: MemoryDTO }>("/api/memories", { method: "POST", ...json({ content }) }),
  deleteMemory: (id: string) =>
    request<{ ok: true }>(`/api/memories/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deleteAllMemories: () => request<{ deleted: number }>("/api/memories", { method: "DELETE" }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
};
