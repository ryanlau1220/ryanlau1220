import { createORPCFetchClient } from '@orpc/client';
import type { contract } from '@portfolio/api';

export const client = createORPCFetchClient<typeof contract>({
  baseURL: '/api/admin',
  headers: () => {
    const token = localStorage.getItem('cms_auth_token') || '';
    return {
      Authorization: `Bearer ${token}`
    };
  }
});
