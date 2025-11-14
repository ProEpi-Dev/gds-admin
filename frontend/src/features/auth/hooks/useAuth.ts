import { useMutation } from '@tanstack/react-query';
import { authService } from '../../../api/services/auth.service';
import type { ChangePasswordDto } from '../../../types/auth.types';

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordDto) => authService.changePassword(data),
  });
}

