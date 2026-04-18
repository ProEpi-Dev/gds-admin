import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import apiClient from "../../../api/client";
import { API_ENDPOINTS } from "../../../api/endpoints";
import { getErrorMessage } from "../../../utils/errorHandler";
import { useSnackbar } from "../../../hooks/useSnackbar";
import type { SetupDto, SetupResponse } from "../../../types/setup.types";

const ORGANIZATION_OPTION = {
  value: "unb-darcy-fcs",
  level1: "UnB",
  level2: "Campus Darcy Ribeiro",
  level3: "FCS",
  label: "UnB > Campus Darcy Ribeiro > FCS",
} as const;

const setupSchema = z
  .object({
    managerName: z.string().min(1, "Nome é obrigatório"),
    managerEmail: z.string().email("Email inválido"),
    managerPassword: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    managerPersonType: z.enum(["student", "communityLeader"]),
    managerEnrollment: z.string().optional(),
    managerOrganizationPath: z.string().optional(),
    contextName: z.string().optional(),
    contextDescription: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.managerPersonType !== "student") {
      return;
    }

    if (!data.managerEnrollment?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["managerEnrollment"],
        message:
          "Matrícula é obrigatória para aluno da Vigilância Epidemiológica Participativa",
      });
    }

    if (!data.managerOrganizationPath?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["managerOrganizationPath"],
        message:
          "Organização é obrigatória para aluno da Vigilância Epidemiológica Participativa",
      });
    }
  });

type SetupFormData = z.input<typeof setupSchema>;

export default function SetupForm() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      managerPersonType: "communityLeader",
      managerOrganizationPath: ORGANIZATION_OPTION.value,
    },
  });

  const managerPersonType = watch("managerPersonType");

  const setupMutation = useMutation({
    mutationFn: async (data: SetupDto): Promise<SetupResponse> => {
      const response = await apiClient.post(API_ENDPOINTS.SETUP.CREATE, data);
      return response.data;
    },
    onSuccess: () => {
      snackbar.showSuccess(
        "Sistema configurado com sucesso! Redirecionando para login...",
      );
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    },
    onError: (err: unknown) => {
      const errorMessage = getErrorMessage(err, "Erro ao configurar sistema");
      snackbar.showError(errorMessage);
    },
  });

  const onSubmit = (data: SetupFormData) => {
    const { managerOrganizationPath, managerPersonType, ...setupData } = data;
    void managerOrganizationPath;
    void managerPersonType;

    setupMutation.mutate({
      ...setupData,
      managerEnrollment:
        data.managerPersonType === "student"
          ? data.managerEnrollment
          : undefined,
      managerOrganizationLevel1:
        data.managerPersonType === "student"
          ? ORGANIZATION_OPTION.level1
          : undefined,
      managerOrganizationLevel2:
        data.managerPersonType === "student"
          ? ORGANIZATION_OPTION.level2
          : undefined,
      managerOrganizationLevel3:
        data.managerPersonType === "student"
          ? ORGANIZATION_OPTION.level3
          : undefined,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
        Dados do Administrador
      </Typography>

      <TextField
        {...register("managerName")}
        label="Nome do Administrador"
        fullWidth
        margin="normal"
        error={!!errors.managerName}
        helperText={errors.managerName?.message}
        required
      />

      <TextField
        {...register("managerEmail")}
        label="Email do Administrador"
        type="email"
        fullWidth
        margin="normal"
        error={!!errors.managerEmail}
        helperText={errors.managerEmail?.message}
        required
      />

      <TextField
        {...register("managerPassword")}
        label="Senha do Administrador"
        type="password"
        fullWidth
        margin="normal"
        error={!!errors.managerPassword}
        helperText={errors.managerPassword?.message}
        required
      />

      <TextField
        {...register("managerPersonType")}
        select
        label="Perfil do administrador"
        fullWidth
        margin="normal"
      >
        <MenuItem value="student">Aluno</MenuItem>
        <MenuItem value="communityLeader">Líder comunitário</MenuItem>
      </TextField>

      {managerPersonType === "student" && (
        <>
          <TextField
            {...register("managerEnrollment")}
            label="Matrícula do Administrador"
            fullWidth
            margin="normal"
            error={!!errors.managerEnrollment}
            helperText={errors.managerEnrollment?.message}
            required
          />

          <TextField
            {...register("managerOrganizationPath")}
            select
            label="Organização"
            fullWidth
            margin="normal"
            error={!!errors.managerOrganizationPath}
            helperText={errors.managerOrganizationPath?.message}
            required
          >
            <MenuItem value={ORGANIZATION_OPTION.value}>
              {ORGANIZATION_OPTION.label}
            </MenuItem>
          </TextField>
        </>
      )}

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
        Dados do Contexto Padrão
      </Typography>

      <TextField
        {...register("contextName")}
        label="Nome do Contexto"
        fullWidth
        margin="normal"
        error={!!errors.contextName}
        helperText={errors.contextName?.message}
        placeholder="Contexto Principal"
      />

      <TextField
        {...register("contextDescription")}
        label="Descrição do Contexto"
        fullWidth
        margin="normal"
        multiline
        rows={3}
        error={!!errors.contextDescription}
        helperText={errors.contextDescription?.message}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={setupMutation.isPending}
      >
        {setupMutation.isPending ? (
          <CircularProgress size={24} />
        ) : (
          "Configurar Sistema"
        )}
      </Button>
    </Box>
  );
}
