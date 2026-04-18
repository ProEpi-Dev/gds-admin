import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import {
  PersonSearch as PersonSearchIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import { useCreateParticipation } from "../hooks/useParticipations";
import { useRoles } from "../../roles/hooks/useRoles";
import { getErrorMessage } from "../../../utils/errorHandler";
import { useTranslation } from "../../../hooks/useTranslation";
import SelectUser from "../../../components/common/SelectUser";
import SelectContext from "../../../components/common/SelectContext";
import { useCurrentContext } from "../../../contexts/CurrentContextContext";
import type { CreateParticipationDto } from "../../../types/participation.types";

const ORGANIZATION_OPTION = {
  value: "unb-darcy-fcs",
  level1: "UnB",
  level2: "Campus Darcy Ribeiro",
  level3: "FCS",
  label: "UnB > Campus Darcy Ribeiro > FCS",
} as const;

// ── Schemas ─────────────────────────────────────────────────────────────────

const baseSchema = z.object({
  contextId: z.number().min(1, "Contexto é obrigatório"),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().optional(),
  active: z.boolean().optional(),
  roleId: z.number().min(1, "Papel é obrigatório"),
});

const existingUserSchema = baseSchema
  .extend({
    mode: z.literal("existing"),
    userId: z.number().min(1, "Usuário é obrigatório"),
  })
  .refine(
    (d) =>
      !d.endDate ||
      !d.startDate ||
      new Date(d.endDate) >= new Date(d.startDate),
    {
      message: "Data de término deve ser maior ou igual à data de início",
      path: ["endDate"],
    },
  );

const newUserSchema = baseSchema
  .extend({
    mode: z.literal("new"),
    newUserName: z.string().min(1, "Nome é obrigatório"),
    newUserEmail: z.string().email("E-mail inválido"),
    newUserPassword: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
    newUserPersonType: z.enum(["student", "communityLeader"]),
    newUserEnrollment: z.string().optional(),
    newUserOrganizationPath: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.newUserPersonType !== "student") {
      return;
    }

    if (!data.newUserEnrollment?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newUserEnrollment"],
        message:
          "Matrícula é obrigatória para aluno da Vigilância Epidemiológica Participativa",
      });
    }

    if (!data.newUserOrganizationPath?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newUserOrganizationPath"],
        message:
          "Organização é obrigatória para aluno da Vigilância Epidemiológica Participativa",
      });
    }
  })
  .refine(
    (d) =>
      !d.endDate ||
      !d.startDate ||
      new Date(d.endDate) >= new Date(d.startDate),
    {
      message: "Data de término deve ser maior ou igual à data de início",
      path: ["endDate"],
    },
  );

const formSchema = z.discriminatedUnion("mode", [
  existingUserSchema,
  newUserSchema,
]);
type FormData = z.input<typeof formSchema>;

export default function ParticipationCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentContext } = useCurrentContext();
  const [error, setError] = useState<string | null>(null);
  const [userMode, setUserMode] = useState<"existing" | "new">("existing");

  const { data: rolesData, isLoading: rolesLoading } = useRoles();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: "existing",
      contextId: currentContext?.id ?? 0,
      active: true,
      roleId: 0,
      startDate: new Date().toISOString().slice(0, 10),
    } as FormData,
  });

  // Apenas papéis de contexto: superadmin não pode ser concedido via participação
  const rolesList = (rolesData ?? []).filter((r) => r.scope === "context");
  useEffect(() => {
    if (!rolesList.length) return;
    const participantRole = rolesList.find((r) => r.code === "participant");
    if (participantRole) {
      setValue("roleId", participantRole.id);
    } else {
      setValue("roleId", rolesList[0].id);
    }
  }, [rolesList, setValue]);

  const active = watch("active");

  const createMutation = useCreateParticipation();

  const handleModeChange = (
    _: React.SyntheticEvent,
    newMode: "existing" | "new",
  ) => {
    setUserMode(newMode);
    setValue("mode", newMode);
    if (newMode === "existing") {
      setValue("newUserName" as keyof FormData, "" as never);
      setValue("newUserEmail" as keyof FormData, "" as never);
      setValue("newUserPassword" as keyof FormData, "" as never);
      setValue(
        "newUserPersonType" as keyof FormData,
        "communityLeader" as never,
      );
      setValue("newUserEnrollment" as keyof FormData, "" as never);
      setValue(
        "newUserOrganizationPath" as keyof FormData,
        ORGANIZATION_OPTION.value as never,
      );
    } else {
      setValue("userId" as keyof FormData, 0 as never);
      setValue(
        "newUserPersonType" as keyof FormData,
        "communityLeader" as never,
      );
      setValue(
        "newUserOrganizationPath" as keyof FormData,
        ORGANIZATION_OPTION.value as never,
      );
    }
  };

  const onSubmit = (data: FormData) => {
    setError(null);

    const participationData: CreateParticipationDto =
      data.mode === "existing"
        ? {
            userId: data.userId,
            contextId: data.contextId,
            startDate: data.startDate,
            endDate: data.endDate || undefined,
            active: data.active,
            roleId: data.roleId,
          }
        : {
            newUserName: data.newUserName,
            newUserEmail: data.newUserEmail,
            newUserPassword: data.newUserPassword,
            newUserEnrollment:
              data.newUserPersonType === "student"
                ? data.newUserEnrollment
                : undefined,
            newUserOrganizationLevel1:
              data.newUserPersonType === "student"
                ? ORGANIZATION_OPTION.level1
                : undefined,
            newUserOrganizationLevel2:
              data.newUserPersonType === "student"
                ? ORGANIZATION_OPTION.level2
                : undefined,
            newUserOrganizationLevel3:
              data.newUserPersonType === "student"
                ? ORGANIZATION_OPTION.level3
                : undefined,
            contextId: data.contextId,
            startDate: data.startDate,
            endDate: data.endDate || undefined,
            active: data.active,
            roleId: data.roleId,
          };

    createMutation.mutate(participationData, {
      onSuccess: (participation) => {
        navigate(`/participations/${participation.id}`);
      },
      onError: (err: unknown) => {
        setError(
          getErrorMessage(err, t("participations.errorCreatingParticipation")),
        );
      },
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t("participations.newParticipation")}
      </Typography>
      {currentContext && (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Contexto: <strong>{currentContext.name}</strong>
        </Typography>
      )}

      <Paper sx={{ p: 3, mt: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            {/* Contexto: só exibe seletor quando não há contexto pré-definido */}
            {!currentContext && (
              <Controller
                name="contextId"
                control={control}
                render={({ field }) => (
                  <SelectContext
                    value={field.value || null}
                    onChange={(id) => field.onChange(id ?? 0)}
                    required
                    error={!!errors.contextId}
                    helperText={errors.contextId?.message}
                  />
                )}
              />
            )}

            {/* Seleção do usuário */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Usuário
              </Typography>
              <Tabs
                value={userMode}
                onChange={handleModeChange}
                sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
              >
                <Tab
                  value="existing"
                  label="Usuário existente"
                  icon={<PersonSearchIcon />}
                  iconPosition="start"
                />
                <Tab
                  value="new"
                  label="Novo usuário"
                  icon={<PersonAddIcon />}
                  iconPosition="start"
                />
              </Tabs>

              {userMode === "existing" ? (
                <Controller
                  name={"userId" as keyof FormData}
                  control={control}
                  render={({ field }) => (
                    <SelectUser
                      value={field.value as number | undefined}
                      onChange={(id) => field.onChange(id ?? 0)}
                      required
                      error={!!(errors as Record<string, unknown>).userId}
                      helperText={
                        (errors as Record<string, { message?: string }>).userId
                          ?.message
                      }
                    />
                  )}
                />
              ) : (
                <Stack spacing={2}>
                  <TextField
                    {...register("newUserName" as keyof FormData)}
                    label="Nome completo"
                    fullWidth
                    required
                    error={!!(errors as Record<string, unknown>).newUserName}
                    helperText={
                      (errors as Record<string, { message?: string }>)
                        .newUserName?.message
                    }
                  />
                  <TextField
                    {...register("newUserEmail" as keyof FormData)}
                    label="E-mail"
                    type="email"
                    fullWidth
                    required
                    error={!!(errors as Record<string, unknown>).newUserEmail}
                    helperText={
                      (errors as Record<string, { message?: string }>)
                        .newUserEmail?.message
                    }
                  />
                  <TextField
                    {...register("newUserPassword" as keyof FormData)}
                    label="Senha"
                    type="password"
                    fullWidth
                    required
                    error={
                      !!(errors as Record<string, unknown>).newUserPassword
                    }
                    helperText={
                      (errors as Record<string, { message?: string }>)
                        .newUserPassword?.message
                    }
                  />
                  <TextField
                    {...register("newUserPersonType" as keyof FormData)}
                    select
                    label="Perfil"
                    fullWidth
                    defaultValue="communityLeader"
                  >
                    <MenuItem value="student">Aluno</MenuItem>
                    <MenuItem value="communityLeader">
                      Líder comunitário
                    </MenuItem>
                  </TextField>
                  {watch("newUserPersonType" as keyof FormData) ===
                    "student" && (
                    <>
                      <TextField
                        {...register("newUserEnrollment" as keyof FormData)}
                        label="Matrícula"
                        fullWidth
                        required
                        error={
                          !!(errors as Record<string, unknown>)
                            .newUserEnrollment
                        }
                        helperText={
                          (errors as Record<string, { message?: string }>)
                            .newUserEnrollment?.message
                        }
                      />
                      <TextField
                        {...register(
                          "newUserOrganizationPath" as keyof FormData,
                        )}
                        select
                        label="Organização"
                        fullWidth
                        required
                        defaultValue={ORGANIZATION_OPTION.value}
                        error={
                          !!(errors as Record<string, unknown>)
                            .newUserOrganizationPath
                        }
                        helperText={
                          (errors as Record<string, { message?: string }>)
                            .newUserOrganizationPath?.message
                        }
                      >
                        <MenuItem value={ORGANIZATION_OPTION.value}>
                          {ORGANIZATION_OPTION.label}
                        </MenuItem>
                      </TextField>
                    </>
                  )}
                </Stack>
              )}
            </Box>

            <Divider />

            {/* Papel na participação */}
            <Controller
              name="roleId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth required error={!!errors.roleId}>
                  <InputLabel>Papel na participação</InputLabel>
                  <Select
                    {...field}
                    label="Papel na participação"
                    disabled={rolesLoading}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {rolesList.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name}
                        {role.description && (
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            — {role.description}
                          </Typography>
                        )}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.roleId && (
                    <FormHelperText>{errors.roleId.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            <Divider />

            <TextField
              {...register("startDate")}
              label={t("participations.startDate")}
              type="date"
              fullWidth
              required
              error={!!errors.startDate}
              helperText={errors.startDate?.message}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              {...register("endDate")}
              label={t("participations.endDate")}
              type="date"
              fullWidth
              error={!!errors.endDate}
              helperText={errors.endDate?.message}
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={active ?? true}
                  onChange={(e) => setValue("active", e.target.checked)}
                />
              }
              label={t("participations.status")}
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <CircularProgress size={24} />
                ) : (
                  t("common.save")
                )}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate("/participations")}
              >
                {t("common.cancel")}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
