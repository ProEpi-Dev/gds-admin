import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorAlert from "../../../components/common/ErrorAlert";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { useTranslation } from "../../../hooks/useTranslation";
import { getErrorMessage } from "../../../utils/errorHandler";
import { useRaceColor, useUpdateRaceColor } from "../hooks/useRaceColors";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(50, "Nome deve ter no máximo 50 caracteres"),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function RaceColorEditPage() {
  const { id } = useParams<{ id: string }>();
  const raceColorId = id ? parseInt(id, 10) : null;
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const {
    data: raceColor,
    isLoading,
    error: queryError,
  } = useRaceColor(raceColorId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (!raceColor) return;
    reset({ name: raceColor.name, active: raceColor.active });
  }, [raceColor, reset]);

  const active = watch("active");
  const updateMutation = useUpdateRaceColor();

  const onSubmit = (data: FormData) => {
    if (!raceColorId) return;
    setError(null);

    updateMutation.mutate(
      { id: raceColorId, data: { name: data.name, active: data.active } },
      {
        onSuccess: () => {
          snackbar.showSuccess(t("raceColors.updateSuccess"));
          navigate(`/race-colors/${raceColorId}`);
        },
        onError: (err: unknown) => {
          const message = getErrorMessage(err, t("raceColors.errorUpdating"));
          setError(message);
          snackbar.showError(message);
        },
      },
    );
  };

  if (isLoading) return <LoadingSpinner />;
  if (queryError || !raceColor)
    return <ErrorAlert message={t("raceColors.errorLoading")} />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t("common.edit")} {t("raceColors.title")}
      </Typography>

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
            <TextField
              {...register("name")}
              label={t("raceColors.name")}
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={active ?? false}
                  onChange={(e) => setValue("active", e.target.checked)}
                />
              }
              label={t("raceColors.status")}
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <CircularProgress size={24} />
                ) : (
                  t("common.save")
                )}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(`/race-colors/${raceColorId}`)}
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
