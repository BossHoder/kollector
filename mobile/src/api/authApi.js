import { apiRequest } from '../services/apiClient';

export async function getMe() {
  return apiRequest('/auth/me');
}

export async function updateMe(updates) {
  return apiRequest('/auth/me', {
    method: 'PATCH',
    body: updates,
  });
}

export async function updateDefaultAssetTheme(defaultThemeId) {
  return updateMe({
    settings: {
      preferences: {
        assetTheme: {
          defaultThemeId,
        },
      },
    },
  });
}

export default {
  getMe,
  updateMe,
  updateDefaultAssetTheme,
};
