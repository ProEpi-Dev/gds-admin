import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  MenuItem,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "../../../api/services/users.service";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { getErrorMessage } from "../../../utils/errorHandler";
import { useTranslation } from "../../../hooks/useTranslation";
import SelectGender from "../../../components/common/SelectGender";
import SelectRaceColor from "../../../components/common/SelectRaceColor";
import SelectLocationThreeLevels from "../../../components/common/SelectLocationThreeLevels";
import UserLayout from "../../../components/layout/UserLayout";
import type { UpdateProfileDto } from "../../../types/user.types";

const ORGANIZATION_OPTION = {
  value: "unb-darcy-fcs",
  level1: "UnB",
  level2: "Campus Darcy Ribeiro",
  level3: "FCS",
  label: "UnB > Campus Darcy Ribeiro > FCS",
} as const;

const profileSchema = z
  .object({
    genderId: z.number({ message: "Sexo é obrigatório" }),
    raceColorId: z.number({ message: "Raça/Cor é obrigatória" }),
    birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
    personType: z.enum(["student", "communityLeader"]),
    enrollment: z.string().optional(),
    organizationPath: z.string().optional(),
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
  });

type ProfileFormData = z.input<typeof profileSchema>;

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [level1Id, setLevel1Id] = useState<number | null>(null);
  const [level2Id, setLevel2Id] = useState<number | null>(null);
  const [level3Id, setLevel3Id] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      personType: "communityLeader",
      organizationPath: ORGANIZATION_OPTION.value,
    },
  });

  const birthDate = watch("birthDate");
  const personType = watch("personType");
  const age = useMemo(() => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    const dayDiff = now.getDate() - birth.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
    return years >= 0 ? years : null;
  }, [birthDate]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileDto) => {
      await usersService.updateProfile(data);
    },
    onSuccess: async () => {
      snackbar.showSuccess(t("profile.success"));

      // Invalida todos os caches relacionados ao usuário
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile-status"] }),
        queryClient.invalidateQueries({ queryKey: ["user-role"] }),
      ]);

      // Força o refetch dos dados antes de redirecionar
      const [, userRole] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: ["profile-status"],
          queryFn: () => usersService.getProfileStatus(),
        }),
        queryClient.fetchQuery({
          queryKey: ["user-role"],
          queryFn: () => usersService.getUserRole(),
        }),
      ]);

      // Redireciona baseado no papel do usuário (usando dados recém-carregados)
      if (userRole.isManager) {
        navigate("/dashboard");
      } else {
        navigate("/app/welcome");
      }
    },
    onError: (err: unknown) => {
      const errorMessage = getErrorMessage(err, "Erro ao atualizar perfil");
      snackbar.showError(errorMessage);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    if (!level3Id) {
      setLocationError(t("profile.errors.locationRequired"));
      return;
    }

    setLocationError(null);

    const payload: UpdateProfileDto = {
      genderId: data.genderId,
      raceColorId: data.raceColorId,
      birthDate: data.birthDate,
      enrollment: data.personType === "student" ? data.enrollment : undefined,
      organizationLevel1:
        data.personType === "student" ? ORGANIZATION_OPTION.level1 : undefined,
      organizationLevel2:
        data.personType === "student" ? ORGANIZATION_OPTION.level2 : undefined,
      organizationLevel3:
        data.personType === "student" ? ORGANIZATION_OPTION.level3 : undefined,
      locationId: level3Id,
    };

    updateProfileMutation.mutate(payload);
  };

  return (
    <UserLayout>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: { xs: "100%", sm: 600 },
          maxWidth: "100%",
          boxSizing: "border-box",
          mx: "auto",
          mt: 4,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {t("profile.title")}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mb: 4 }}
        >
          {t("profile.subtitle")}
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ mb: 2 }}>
            <Controller
              name="genderId"
              control={control}
              render={({ field }) => (
                <SelectGender
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.genderId}
                  helperText={errors.genderId?.message}
                  required
                  label={t("profile.sex")}
                />
              )}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Controller
              name="raceColorId"
              control={control}
              render={({ field }) => (
                <SelectRaceColor
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.raceColorId}
                  helperText={errors.raceColorId?.message}
                  required
                  label={t("profile.raceColor")}
                />
              )}
            />
          </Box>

          <TextField
            {...register("birthDate")}
            label={t("profile.birthDate")}
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            error={!!errors.birthDate}
            helperText={
              errors.birthDate?.message ||
              (age !== null ? `${t("profile.age")}: ${age}` : undefined)
            }
            required
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
                label={t("profile.enrollment")}
                fullWidth
                margin="normal"
                error={!!errors.enrollment}
                helperText={errors.enrollment?.message}
                required
              />

              <TextField
                {...register("organizationPath")}
                select
                label={t("profile.organization")}
                fullWidth
                margin="normal"
                error={!!errors.organizationPath}
                helperText={errors.organizationPath?.message}
                required
              >
                <MenuItem value={ORGANIZATION_OPTION.value}>
                  {ORGANIZATION_OPTION.label}
                </MenuItem>
              </TextField>
            </>
          )}

          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t("profile.location")}
            </Typography>
            <SelectLocationThreeLevels
              level1Id={level1Id}
              level2Id={level2Id}
              level3Id={level3Id}
              onLevel1Change={(value) => {
                setLevel1Id(value);
                setLevel2Id(null);
                setLevel3Id(null);
              }}
              onLevel2Change={(value) => {
                setLevel2Id(value);
                setLevel3Id(null);
              }}
              onLevel3Change={setLevel3Id}
              required
              error={!!locationError}
              helperText={locationError ?? undefined}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              t("profile.submit")
            )}
          </Button>
        </Box>
      </Paper>
    </UserLayout>
  );
}
