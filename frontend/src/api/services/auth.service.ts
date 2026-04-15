import axios from 'axios';
import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import { API_BASE_URL } from '../../utils/constants';
import type {
  LoginDto,
  LoginResponse,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SignupDto,
  SignupResponse,
} from '../../types/auth.types';

export const authService = {
  async login(data: LoginDto): Promise<LoginResponse> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, data);
    return response.data;
  },

  async changePassword(data: ChangePasswordDto): Promise<void> {
    await apiClient.patch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },

  async forgotPassword(data: ForgotPasswordDto): Promise<{ message: string }> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
    return response.data;
  },

  async resetPassword(data: ResetPasswordDto): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, data);
  },

  async signup(data: SignupDto): Promise<SignupResponse> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.SIGNUP, data);
    return response.data;
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, {
      token,
    });
    return response.data;
  },

  async requestEmailVerification(
    email: string,
  ): Promise<{ message: string }> {
    const response = await apiClient.post(
      API_ENDPOINTS.AUTH.REQUEST_EMAIL_VERIFICATION,
      { email },
    );
    return response.data;
  },

  /** Revoga o refresh token no servidor (axios direto para evitar interceptor). */
  async revokeRefreshToken(refreshToken: string | null): Promise<void> {
    if (!refreshToken) return;
    try {
      await axios.post(
        `${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );
    } catch {
      // sessão local já será limpa
    }
  },
};

