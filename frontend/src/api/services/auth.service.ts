import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
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
};

