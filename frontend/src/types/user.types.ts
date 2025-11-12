export interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  active?: boolean;
}

import type { PaginationQuery } from './api.types';

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  active?: boolean;
}

export interface UserQuery extends PaginationQuery {
  active?: boolean;
  search?: string;
}

