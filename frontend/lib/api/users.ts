/** Current user + team endpoints. */
import { api } from "./client";
import { clearTokens } from "./tokens";
import type {
  AssetWithContent,
  AvatarMeta,
  ChangePasswordPayload,
  CreateUserPayload,
  CreateUserResult,
  Paginated,
  ResetPasswordResult,
  SessionUser,
  TeamUser,
  UpdateUserPayload,
  UserPreferences,
} from "./types";

/** GET /users/me — session bootstrap (user, organization, role, permissions, preferences). */
export function getMe(opts?: { signal?: AbortSignal }): Promise<SessionUser> {
  return api.get<SessionUser>("/users/me", opts);
}

/** PATCH /users/change-password — revokes all sessions; tokens are cleared. */
export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<{ changed: boolean; reauthenticationRequired: boolean }> {
  const result = await api.patch<{ changed: boolean; reauthenticationRequired: boolean }>(
    "/users/change-password",
    payload,
  );
  clearTokens();
  return result;
}

/* ---------- Preferences ---------- */

export function getPreferences(): Promise<UserPreferences> {
  return api.get<UserPreferences>("/users/me/preferences");
}

export function updatePreferences(
  payload: Partial<Pick<UserPreferences, "theme" | "notificationsEnabled">>,
): Promise<UserPreferences> {
  return api.patch<UserPreferences>("/users/me/preferences", payload);
}

/* ---------- Avatar (own) ---------- */

export function getAvatar(avatarAssetId: string): Promise<AssetWithContent> {
  return api.get<AssetWithContent>(`/users/avatar/${avatarAssetId}`);
}

export function uploadAvatar(file: File): Promise<AvatarMeta> {
  const form = new FormData();
  form.append("file", file);
  return api.upload<AvatarMeta>("/users/avatar", form);
}

export function deleteAvatar(): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>("/users/avatar");
}

/* ---------- Team ---------- */

export function listUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  signal?: AbortSignal;
}): Promise<Paginated<TeamUser>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<TeamUser>>("/users", { query, signal });
}

export function getUser(id: string, opts?: { signal?: AbortSignal }): Promise<TeamUser> {
  return api.get<TeamUser>(`/users/${id}`, opts);
}

export function createUser(payload: CreateUserPayload): Promise<CreateUserResult> {
  return api.post<CreateUserResult>("/users", payload);
}

export function updateUser(id: string, payload: UpdateUserPayload): Promise<TeamUser> {
  return api.patch<TeamUser>(`/users/${id}`, payload);
}

export function disableUser(id: string): Promise<TeamUser> {
  return api.patch<TeamUser>(`/users/${id}/disable`);
}

export function enableUser(id: string): Promise<TeamUser> {
  return api.patch<TeamUser>(`/users/${id}/enable`);
}

export function deleteUser(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/users/${id}`);
}

export function resetPassword(id: string): Promise<ResetPasswordResult> {
  return api.patch<ResetPasswordResult>(`/users/${id}/reset-password`);
}
