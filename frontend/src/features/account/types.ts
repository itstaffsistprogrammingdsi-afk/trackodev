import type { User } from "@/lib/auth.service";

// Reuse User dari auth.service supaya shape-nya selalu sinkron
// dengan yang dipakai AuthContext, sidebar, dan UserDropdown.
export type AccountUser = User;

export interface UpdateProfilePayload {
  name: string;
  email: string;
}

export interface UpdateProfileResponse {
  message: string;
  user: AccountUser;
}

export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface UpdatePasswordResponse {
  message: string;
}

export interface UploadAvatarResponse {
  message: string;
  avatar: string;
  user: AccountUser;
}
