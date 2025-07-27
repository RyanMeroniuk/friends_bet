// frontend/src/api/group.ts
import api from './axios';

export interface GroupResponse {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export interface CreateGroupRequest {
  name: string;
}

export interface JoinGroupRequest {
  userId: string;
}

/**
 * GET /api/groups
 */
export async function listGroups(): Promise<GroupResponse[]> {
  const resp = await api.get<GroupResponse[]>('/api/groups');
  return resp.data;
}

/**
 * POST /api/groups
 */
export async function createGroup(name: string): Promise<GroupResponse> {
  const resp = await api.post<GroupResponse>('/api/groups', { name });
  return resp.data;
}

/**
 * POST /api/groups/{inviteCode}/join
 */
export async function joinGroup(
  inviteCode: string,
  userId: string
): Promise<GroupResponse> {
  const resp = await api.post<GroupResponse>(
    `/api/groups/${inviteCode}/join`,
    { userId }
  );
  return resp.data;
}
