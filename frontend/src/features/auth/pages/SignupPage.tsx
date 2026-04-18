import {
  Box,
  Container,
  Paper,
  Typography,
  Link as MuiLink,
  CircularProgress,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField, Button, MenuItem } from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authService } from "../../../api/services/auth.service";
import { legalDocumentsService } from "../../../api/services/legal-documents.service";
import { useAuth } from "../../../contexts/AuthContext";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { getErrorMessage } from "../../../utils/errorHandler";
import { useTranslation } from "../../../hooks/useTranslation";
import SelectPublicContext from "../../../components/common/SelectPublicContext";
import LegalDocumentsAcceptance from "../../../components/auth/LegalDocumentsAcceptance";
import type { SignupDto } from "../../../types/auth.types";

const ORGANIZATION_OPTION = {
  value: "unb-darcy-fcs",
  level1: "UnB",
  level2: "Campus Darcy Ribeiro",
  level3: "FCS",
  label: "UnB > Campus Darcy Ribeiro > FCS",
} as const;

const signupSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string(),
    personType: z.enum(["student", "communityLeader"]),
    enrollment: z.string().optional(),
    organizationPath: z.string().optional(),
    contextId: z.number({ message: "Você deve selecionar um contexto" }),
    acceptedLegalDocumentIds: z
      .array(z.number())
      .min(1, "Você deve aceitar os documentos obrigatórios"),
  })
  .superRefine((data, ctx) => {
    if (data.personType !== "student") {
      return;
    }

    if (!data.enrollment?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["enrollment"],
        message:
          "Matrícula é obrigatória para aluno da Vigilância Epidemiológica Participativa",
      });
    }

    if (!data.organizationPath?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organizationPath"],
        message:
          "Organização é obrigatória para aluno da Vigilância Epidemiológica Participativa",
      });
    }
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

type SignupFormData = z.input<typeof signupSchema>;

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const [acceptedDocumentIds, setAcceptedDocumentIds] = useState<number[]>([]);

  const { data: termsOfUse, isLoading: documentsLoading } = useQuery({
    queryKey: ["legal-documents-terms-of-use"],
    queryFn: () => legalDocumentsService.findByTypeCode("TERMS_OF_USE"),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      personType: "communityLeader",
      organizationPath: ORGANIZATION_OPTION.value,
      acceptedLegalDocumentIds: [],
    },
  });

  const personType = watch("personType");

  const signupMutation = useMutation({
    mutationFn: async (data: SignupDto) => {
      const response = await authService.signup(data);
      return response;
    },
    onSuccess: (data) => {
      login(
        data.token,
        { ...data.user, participation: data.participation },
        data.participation,
      );
      snackbar.showSuccess(t("signup.success"));
      navigate("/app/complete-profile");
    },
    onError: (err: unknown) => {
      const errorMessage = getErrorMessage(err, "Erro ao criar conta");
      snackbar.showError(errorMessage);
    },
  });

  const onSubmit = (data: SignupFormData) => {
    const { confirmPassword, organizationPath, personType, ...signupData } =
      data;
    void confirmPassword;
    void organizationPath;
    void personType;

    signupMutation.mutate({
      ...signupData,
      enrollment: data.personType === "student" ? data.enrollment : undefined,
      organizationLevel1:
        data.personType === "student" ? ORGANIZATION_OPTION.level1 : undefined,
      organizationLevel2:
        data.personType === "student" ? ORGANIZATION_OPTION.level2 : undefined,
      organizationLevel3:
        data.personType === "student" ? ORGANIZATION_OPTION.level3 : undefined,
    });
  };

  const handleLegalDocumentsChange = (ids: number[]) => {
    setAcceptedDocumentIds(ids);
    setValue("acceptedLegalDocumentIds", ids, { shouldValidate: true });
  };

  const allRequiredAccepted = termsOfUse
    ? acceptedDocumentIds.includes(termsOfUse.id)
    : false;

  if (documentsLoading) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t("signup.title")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mb: 4 }}
          >
            {t("signup.subtitle")}
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              {...register("name")}
              label={t("signup.fullName")}
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
              autoFocus
            />

            <TextField
              {...register("email")}
              label={t("auth.email")}
              type="email"
              fullWidth
              margin="normal"
              error={!!errors.email}
              helperText={errors.email?.message}
              autoComplete="email"
            />

            <TextField
              {...register("password")}
              label={t("auth.password")}
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message}
              autoComplete="new-password"
            />

            <TextField
              {...register("confirmPassword")}
              label={t("signup.confirmPassword")}
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              autoComplete="new-password"
            />

            <TextField
              {...register("personType")}
              select
              label="Perfil"
              fullWidth
              margin="normal"
            >
              <MenuItem value="student">Aluno</MenuItem>
              <MenuItem value="communityLeader">Líder comunitário</MenuItem>
            </TextField>

            {personType === "student" && (
              <>
                <TextField
                  {...register("enrollment")}
                  label={t("signup.enrollment")}
                  fullWidth
                  margin="normal"
                  error={!!errors.enrollment}
                  helperText={errors.enrollment?.message}
                />

                <TextField
                  {...register("organizationPath")}
                  select
                  label={t("signup.organizationPath")}
                  fullWidth
                  margin="normal"
                  error={!!errors.organizationPath}
                  helperText={errors.organizationPath?.message}
                >
                  <MenuItem value={ORGANIZATION_OPTION.value}>
                    {ORGANIZATION_OPTION.label}
                  </MenuItem>
                </TextField>
              </>
            )}

            <Box sx={{ mt: 2, mb: 2 }}>
              <Controller
                name="contextId"
                control={control}
                render={({ field }) => (
                  <SelectPublicContext
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.contextId}
                    helperText={
                      errors.contextId?.message || t("signup.contextHelper")
                    }
                    required
                    label={t("signup.selectContext")}
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
              {signupMutation.isPending ? (
                <CircularProgress size={24} />
              ) : (
                t("signup.submit")
              )}
            </Button>

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography variant="body2">
                {t("signup.alreadyHaveAccount")}{" "}
                <MuiLink component={Link} to="/login" underline="hover">
                  {t("signup.loginLink")}
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
