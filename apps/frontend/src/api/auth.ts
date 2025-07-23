const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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
  display_name: string;
  avatar_url: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string;
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

export interface RefreshResponse {
  message: string;
  accessToken: string;
  user: User;
}

export interface MessageResponse {
  message: string;
}

export interface UserResponse {
  user: User;
}

export interface ApiError {
  error: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface VerifyEmailData {
  token: string;
}

export interface ResendVerificationData {
  email: string;
}

export interface VerifyEmailCodeData {
  email: string;
  code: string;
}

export interface TwoFactorInitResponse {
  message: string;
  requiresTwoFactor: boolean;
  userId: number;
}

export interface TwoFactorVerifyData {
  userId: number;
  code: string;
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

        window.dispatchEvent(new CustomEvent("auth:logout"));
      }

      const error = new Error(data.error || `HTTP ${response.status}`);
      Object.assign(error, data);
      throw error;
    }

    return data;
  }

  async register(userData: RegisterData): Promise<RegisterResponse> {
    return await this.request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async login(userData: LoginData): Promise<TwoFactorInitResponse> {
    return await this.request<TwoFactorInitResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async verifyTwoFactor(userId: number, code: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/login/verify", {
      method: "POST",
      body: JSON.stringify({ userId, code }),
    });

    localStorage.setItem("accessToken", response.accessToken);
    localStorage.setItem("user", JSON.stringify(response.user));

    return response;
  }

  async initTwoFactorLogin(
    userData: LoginData
  ): Promise<TwoFactorInitResponse> {
    return await this.request<TwoFactorInitResponse>("/auth/login/init", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<MessageResponse> {
    try {
      const response = await this.request<MessageResponse>("/auth/logout", {
        method: "POST",
      });

      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");

      window.dispatchEvent(new CustomEvent("auth:logout"));

      return response;
    } catch (error) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.dispatchEvent(new CustomEvent("auth:logout"));
      throw error;
    }
  }

  async refresh(): Promise<RefreshResponse> {
    return await this.request<RefreshResponse>("/auth/refresh", {
      method: "POST",
    });
  }

  async getMe(): Promise<UserResponse> {
    return await this.request<UserResponse>("/auth/me");
  }

  async verifyEmail(data: VerifyEmailData): Promise<MessageResponse> {
    return await this.request<MessageResponse>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async resendVerification(
    data: ResendVerificationData
  ): Promise<MessageResponse> {
    const result = await this.request<MessageResponse>(
      "/auth/resend-verification",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return result;
  }

  async verifyEmailCode(data: VerifyEmailCodeData): Promise<MessageResponse> {
    const result = await this.request<MessageResponse>(
      "/auth/verify-email-code",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return result;
  }

  async forgotPassword(data: ForgotPasswordData): Promise<MessageResponse> {
    return await this.request<MessageResponse>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async resetPassword(data: ResetPasswordData): Promise<MessageResponse> {
    return await this.request<MessageResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: ChangePasswordData): Promise<MessageResponse> {
    return await this.request<MessageResponse>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  isAuthenticated(): boolean {
    const accessToken = localStorage.getItem("accessToken");
    const user = localStorage.getItem("user");
    return !!(accessToken && user);
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  setAuth(accessToken: string, user: User): void {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new CustomEvent("auth:login", { detail: { user } }));
  }

  clearAuth(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }
}

export const authAPI = new AuthAPI();
