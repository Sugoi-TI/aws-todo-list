import { fetchAuthSession } from "aws-amplify/auth";

const API_URL = import.meta.env.VITE_API_URL;

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const session = await fetchAuthSession();

    const token = session.tokens?.idToken?.toString();

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
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
