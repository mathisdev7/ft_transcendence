const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export interface UpdateProfileData {
  display_name?: string;
  avatar_url?: string;
}

export interface UserProfile {
  id: number;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface SearchUsersResponse {
  users: UserProfile[];
}

export interface UpdateProfileResponse {
  message: string;
  user: {
    id: number;
    email: string;
    display_name: string;
    avatar_url: string;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
    last_login: string;
  };
}

class ProfileAPI {
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

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }

      const error = new Error(data.error || `HTTP ${response.status}`);
      throw error;
    }

    return response.json();
  }

  async updateProfile(data: UpdateProfileData): Promise<UpdateProfileResponse> {
    return await this.request<UpdateProfileResponse>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getUserProfile(userId: number): Promise<{ user: UserProfile }> {
    return await this.request<{ user: UserProfile }>(
      `/auth/users/${userId}/profile`
    );
  }

  async searchUsers(
    query: string,
    limit: number = 10
  ): Promise<SearchUsersResponse> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    return await this.request<SearchUsersResponse>(
      `/auth/users/search?${params}`
    );
  }

  async uploadAvatar(file: File): Promise<string> {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error(
        "Missing Cloudinary configuration. Please configure VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env"
      );
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image cannot exceed 5MB");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || error.message || "Error uploading image"
      );
    }

    const data = await response.json();

    const transformedUrl = data.secure_url.replace(
      "/image/upload/",
      "/image/upload/w_200,h_200,c_fill,g_face,f_auto,q_auto/"
    );

    return transformedUrl;
  }

  getDefaultAvatarUrl(displayName: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=random&color=fff&size=200&bold=true`;
  }
}

export const profileAPI = new ProfileAPI();
