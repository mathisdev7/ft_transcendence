import Swal from "sweetalert2";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_verified: boolean;
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  userId: number;
}

export interface ApiError {
  error: string;
}

class AuthAPI {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const accessToken = localStorage.getItem("accessToken");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      headers,
      credentials: "include",
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && endpoint !== "/auth/login") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        await Swal.fire({
          icon: "warning",
          title: "Session expired",
          text: "Please sign in again",
          confirmButtonText: "OK",
        });

        window.location.reload();
      }
      throw new Error((data as ApiError).error || "an error occurred");
    }

    return data;
  }

  async register(userData: RegisterData): Promise<RegisterResponse> {
    try {
      return await this.request<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Registration failed",
        text: error instanceof Error ? error.message : "an error occurred",
        confirmButtonText: "OK",
      });
      throw error;
    }
  }

  async login(userData: LoginData): Promise<AuthResponse> {
    try {
      return await this.request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(userData),
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Login failed",
        text: error instanceof Error ? error.message : "an error occurred",
        confirmButtonText: "OK",
      });
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>("/auth/logout", {
        method: "POST",
      });

      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");

      await Swal.fire({
        icon: "success",
        title: "Logged out",
        text: "You have been successfully logged out",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  isAuthenticated(): boolean {
    const accessToken = localStorage.getItem("accessToken");
    const user = localStorage.getItem("user");
    return !!(accessToken && user);
  }
}

export const authAPI = new AuthAPI();
