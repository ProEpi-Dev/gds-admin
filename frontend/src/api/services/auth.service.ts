import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { LoginDto, LoginResponse, ChangePasswordDto, SignupDto, SignupResponse } from '../../types/auth.types';

export const authService = {
  async login(data: LoginDto): Promise<LoginResponse> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, data);
    return response.data;
  },

  async changePassword(data: ChangePasswordDto): Promise<void> {
    await apiClient.patch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },

  async signup(data: SignupDto): Promise<SignupResponse> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.SIGNUP, data);
    return response.data;
  },
};

