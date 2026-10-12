import type { UserFilters, UsersResponse, UserMutationPayload } from './types';

const retiredMessage = 'Legacy users table retired. Manage teammates through Clerk organization controls.';

export async function getUsers(filters: UserFilters): Promise<UsersResponse> {
  return {
    success: true,
    time: new Date().toISOString(),
    message: retiredMessage,
    total_users: 0,
    offset: ((filters.page || 1) - 1) * (filters.limit || 10),
    limit: filters.limit || 10,
    users: []
  };
}

export async function createUser(_data: UserMutationPayload) {
  throw new Error(retiredMessage);
}

export async function updateUser(_id: number, _data: UserMutationPayload) {
  throw new Error(retiredMessage);
}

export async function deleteUser(_id: number) {
  throw new Error(retiredMessage);
}
