import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Chip,
  Divider,
  MenuItem,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { usersService } from "../../../api/services/users.service";
import { locationsService } from "../../../api/services/locations.service";
import { useAuth } from "../../../contexts/AuthContext";
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

const profileSchema = z.object({
  genderId: z.number().optional(),
  raceColorId: z.number().optional(),
  birthDate: z.string().optional(),
  personType: z.enum(["student", "communityLeader"]),
  enrollment: z.string().optional(),
  organizationPath: z.string().optional(),
});

type ProfileFormData = z.input<typeof profileSchema>;

export default function UserProfilePage() {
  const { user } = useAuth();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const [level1Id, setLevel1Id] = useState<number | null>(null);
  const [level2Id, setLevel2Id] = useState<number | null>(null);
  const [level3Id, setLevel3Id] = useState<number | null>(null);

  const {
    data: profileStatus,
    isLoading: statusLoading,
    refetch,
  } = useQuery({
    queryKey: ["profile-status"],
    queryFn: () => usersService.getProfileStatus(),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (!profileStatus?.profile) return;

    setValue("genderId", profileStatus.profile.genderId ?? undefined);
    setValue("raceColorId", profileStatus.profile.raceColorId ?? undefined);
    setValue("birthDate", profileStatus.profile.birthDate?.slice(0, 10) || "");
    setValue("enrollment", profileStatus.profile.enrollment || "");
    setValue(
      "personType",
      !!(
        profileStatus.profile.enrollment ||
        profileStatus.profile.organizationLevel1 ||
        profileStatus.profile.organizationLevel2 ||
        profileStatus.profile.organizationLevel3
      )
        ? "student"
        : "communityLeader",
    );
    setValue("organizationPath", ORGANIZATION_OPTION.value);
    setLevel3Id(profileStatus.profile.locationId ?? null);
  }, [profileStatus, setValue]);

  useEffect(() => {
    if (!level3Id) {
      if (!profileStatus?.profile.locationId) {
        setLevel1Id(null);
        setLevel2Id(null);
      }
      return;
    }

    let mounted = true;
    locationsService.findOne(level3Id).then((loc) => {
      if (!mounted) return;

      const chain: number[] = [];
      if (loc.parent?.parent?.id) chain.push(loc.parent.parent.id);
      if (loc.parent?.id) chain.push(loc.parent.id);
      chain.push(loc.id);

      if (chain.length === 3) {
        setLevel1Id(chain[0]);
        setLevel2Id(chain[1]);
        setLevel3Id(chain[2]);
      }
    });

    return () => {
      mounted = false;
    };
  }, [level3Id, profileStatus?.profile.locationId]);

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
    onSuccess: () => {
      snackbar.showSuccess(t("profile.success"));
      refetch();
    },
    onError: (err: unknown) => {
      const errorMessage = getErrorMessage(err, "Erro ao atualizar perfil");
      snackbar.showError(errorMessage);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    const payload: UpdateProfileDto = {
      genderId: data.genderId,
      raceColorId: data.raceColorId,
      birthDate: data.birthDate || undefined,
      enrollment: data.personType === "student" ? data.enrollment : undefined,
      organizationLevel1:
        data.personType === "student" ? ORGANIZATION_OPTION.level1 : undefined,
      organizationLevel2:
        data.personType === "student" ? ORGANIZATION_OPTION.level2 : undefined,
      organizationLevel3:
        data.personType === "student" ? ORGANIZATION_OPTION.level3 : undefined,
      locationId: level3Id || undefined,
    };

    updateProfileMutation.mutate(payload);
  };

  if (statusLoading) {
    return (
      <UserLayout>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 700, mx: "auto", mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t("profile.myProfile")}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Status do Perfil:{" "}
            <Chip
              label={
                profileStatus?.isComplete
                  ? t("profile.profileComplete")
                  : t("profile.profileIncomplete")
              }
              color={profileStatus?.isComplete ? "success" : "warning"}
              size="small"
            />
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Informações Básicas
        </Typography>

        <Box sx={{ mb: 3 }}>
          <TextField
            label="Nome"
            value={user?.name || ""}
            fullWidth
            margin="normal"
            disabled
          />
          <TextField
            label="Email"
            value={user?.email || ""}
            fullWidth
            margin="normal"
            disabled
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          {t("profile.editProfile")}
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ mb: 2 }}>
            <Controller
              name="genderId"
              control={control}
              render={({ field }) => (
                <SelectGender
                  value={field.value || null}
                  onChange={field.onChange}
                  error={!!errors.genderId}
                  helperText={errors.genderId?.message}
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
                  value={field.value || null}
                  onChange={field.onChange}
                  error={!!errors.raceColorId}
                  helperText={errors.raceColorId?.message}
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
              />

              <TextField
                {...register("organizationPath")}
                select
                label={t("profile.organization")}
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
              "Atualizar Perfil"
            )}
          </Button>
        </Box>
      </Paper>
    </UserLayout>
  );
}
