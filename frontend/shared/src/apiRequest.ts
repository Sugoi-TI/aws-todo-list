import { fetchAuthSession } from "aws-amplify/auth";

export const createApiRequest = (baseUrl: string) => {
  return async (endpoint: string, options: RequestInit = {}) => {
    try {
      const session = await fetchAuthSession();

      const token = session.tokens?.idToken?.toString();

      console.log(token);
      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Request failed:", error);
      throw error;
    }
  };
};
