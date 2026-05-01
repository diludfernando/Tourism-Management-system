import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_ROLE_KEY = 'authRole';

// In-memory fallback for when AsyncStorage fails
let memoryToken: string | null = null;
let memoryRole: string | null = null;

export const saveAuthSession = async (token: string, role: string) => {
  // Always save to memory first (works immediately)
  memoryToken = token;
  memoryRole = role;
  console.log('saveAuthSession - token saved to memory:', token.substring(0, 20) + '...');

  // Try to save to AsyncStorage as well
  try {
    await AsyncStorage.multiSet([
      [AUTH_TOKEN_KEY, token],
      [AUTH_ROLE_KEY, role],
    ]);
    console.log('saveAuthSession - also saved to AsyncStorage');
  } catch (error) {
    console.error('saveAuthSession - AsyncStorage error (using memory):', error);
  }
};

export const clearAuthSession = async () => {
  memoryToken = null;
  memoryRole = null;
  console.log('clearAuthSession - cleared from memory');

  try {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_ROLE_KEY]);
    console.log('clearAuthSession - also cleared from AsyncStorage');
  } catch (error) {
    console.error('clearAuthSession - AsyncStorage error:', error);
  }
};

export const getAuthToken = async () => {
  // Try AsyncStorage first
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      console.log('getAuthToken - retrieved from AsyncStorage');
      return token;
    }
  } catch (error) {
    console.error('getAuthToken - AsyncStorage error:', error);
  }

  // Fall back to memory
  if (memoryToken) {
    console.log('getAuthToken - retrieved from memory (fallback)');
    return memoryToken;
  }

  console.log('getAuthToken - no token found');
  return null;
};

export const getAuthHeaders = async (baseHeaders: Record<string, string> = {}) => {
  try {
    console.log('getAuthHeaders - requesting token...');
    const token = await getAuthToken();
    console.log('getAuthHeaders - token result:', token ? 'FOUND' : 'MISSING');
    if (!token) return baseHeaders;
    return {
      ...baseHeaders,
      Authorization: `Bearer ${token}`,
    };
  } catch (error) {
    console.error('getAuthHeaders - error reading token:', error);
    return baseHeaders;
  }
};