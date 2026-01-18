import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { 
  CreateUserDto, 
  UpdateUserDto, 
  UserQuery, 
  User,
  UserRoleResponse,
  UpdateProfileDto,
  ProfileStatusResponse,
  LegalAcceptanceStatusResponse,
} from '../../types/user.types';
import type { ListResponse } from '../../types/api.types';

export const usersService = {
  async findAll(query?: UserQuery): Promise<ListResponse<User>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.active !== undefined) params.append('active', query.active.toString());
    if (query?.search) params.append('search', query.search);

    const response = await apiClient.get(`${API_ENDPOINTS.USERS.LIST}?${params.toString()}`);
    return response.data;
  },

  async findOne(id: number): Promise<User> {
    const response = await apiClient.get(API_ENDPOINTS.USERS.DETAIL(id));
    return response.data;
  },

  async create(data: CreateUserDto): Promise<User> {
    const response = await apiClient.post(API_ENDPOINTS.USERS.CREATE, data);
    return response.data;
  },

  async update(id: number, data: UpdateUserDto): Promise<User> {
    const response = await apiClient.patch(API_ENDPOINTS.USERS.UPDATE(id), data);
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.USERS.DELETE(id));
  },

  async getUserRole(): Promise<UserRoleResponse> {
    const response = await apiClient.get(API_ENDPOINTS.USERS.ROLE);
    return response.data;
  },

  async getProfileStatus(): Promise<ProfileStatusResponse> {
    const response = await apiClient.get(API_ENDPOINTS.USERS.PROFILE_STATUS);
    return response.data;
  },

  async updateProfile(data: UpdateProfileDto): Promise<void> {
    await apiClient.patch(API_ENDPOINTS.USERS.UPDATE_PROFILE, data);
  },

  async getLegalAcceptanceStatus(): Promise<LegalAcceptanceStatusResponse> {
    const response = await apiClient.get(API_ENDPOINTS.USERS.LEGAL_ACCEPTANCE_STATUS);
    return response.data;
  },

  async acceptLegalDocuments(legalDocumentIds: number[]): Promise<void> {
    await apiClient.post(API_ENDPOINTS.USERS.ACCEPT_LEGAL_DOCUMENTS, { legalDocumentIds });
  },
};

