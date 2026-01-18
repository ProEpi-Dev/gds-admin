import { Box, Container, Paper, Typography, Link as MuiLink, CircularProgress } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { authService } from '../../../api/services/auth.service';
import { legalDocumentsService } from '../../../api/services/legal-documents.service';
import { useAuth } from '../../../contexts/AuthContext';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectPublicContext from '../../../components/common/SelectPublicContext';
import LegalDocumentsAcceptance from '../../../components/auth/LegalDocumentsAcceptance';
import type { SignupDto } from '../../../types/auth.types';

const signupSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
  contextId: z.number({ message: 'Você deve selecionar um contexto' }),
  acceptedLegalDocumentIds: z.array(z.number()).min(1, 'Você deve aceitar os documentos obrigatórios'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const [acceptedDocumentIds, setAcceptedDocumentIds] = useState<number[]>([]);

  const { data: termsOfUse, isLoading: documentsLoading } = useQuery({
    queryKey: ['legal-documents-terms-of-use'],
    queryFn: () => legalDocumentsService.findByTypeCode('TERMS_OF_USE'),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      acceptedLegalDocumentIds: [],
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupDto) => {
      const response = await authService.signup(data);
      return response;
    },
    onSuccess: (data) => {
      login(data.token, { ...data.user, participation: data.participation }, data.participation);
      snackbar.showSuccess(t('signup.success'));
      navigate('/app/complete-profile');
    },
    onError: (err: unknown) => {
      const errorMessage = getErrorMessage(err, 'Erro ao criar conta');
      snackbar.showError(errorMessage);
    },
  });

  const onSubmit = (data: SignupFormData) => {
    const { confirmPassword, ...signupData } = data;
    signupMutation.mutate(signupData);
  };

  const handleLegalDocumentsChange = (ids: number[]) => {
    setAcceptedDocumentIds(ids);
    setValue('acceptedLegalDocumentIds', ids, { shouldValidate: true });
  };

  const allRequiredAccepted = termsOfUse ? acceptedDocumentIds.includes(termsOfUse.id) : false;

  if (documentsLoading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('signup.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
            {t('signup.subtitle')}
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              {...register('name')}
              label={t('signup.fullName')}
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
              autoFocus
            />

            <TextField
              {...register('email')}
              label={t('auth.email')}
              type="email"
              fullWidth
              margin="normal"
              error={!!errors.email}
              helperText={errors.email?.message}
              autoComplete="email"
            />

            <TextField
              {...register('password')}
              label={t('auth.password')}
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message}
              autoComplete="new-password"
            />

            <TextField
              {...register('confirmPassword')}
              label={t('signup.confirmPassword')}
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              autoComplete="new-password"
            />

            <Box sx={{ mt: 2, mb: 2 }}>
              <Controller
                name="contextId"
                control={control}
                render={({ field }) => (
                  <SelectPublicContext
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.contextId}
                    helperText={errors.contextId?.message || t('signup.contextHelper')}
                    required
                    label={t('signup.selectContext')}
                  />
                )}
              />
            </Box>

            {termsOfUse && (
              <Box sx={{ mt: 3, mb: 2 }}>
                <LegalDocumentsAcceptance
                  documents={[termsOfUse]}
                  acceptedIds={acceptedDocumentIds}
                  onAcceptedChange={handleLegalDocumentsChange}
                  error={!!errors.acceptedLegalDocumentIds}
                  helperText={errors.acceptedLegalDocumentIds?.message}
                />
              </Box>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={signupMutation.isPending || !allRequiredAccepted}
            >
              {signupMutation.isPending ? <CircularProgress size={24} /> : t('signup.submit')}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                {t('signup.alreadyHaveAccount')}{' '}
                <MuiLink component={Link} to="/login" underline="hover">
                  {t('signup.loginLink')}
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
