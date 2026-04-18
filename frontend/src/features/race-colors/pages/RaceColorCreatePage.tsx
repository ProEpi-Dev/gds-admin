import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useSnackbar } from "../../../hooks/useSnackbar";
import { useTranslation } from "../../../hooks/useTranslation";
import { getErrorMessage } from "../../../utils/errorHandler";
import { useCreateRaceColor } from "../hooks/useRaceColors";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(50, "Nome deve ter no máximo 50 caracteres"),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function RaceColorCreatePage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { active: true },
  });

  const active = watch("active");
  const createMutation = useCreateRaceColor();

  const onSubmit = (data: FormData) => {
    setError(null);
    createMutation.mutate(
      { name: data.name },
      {
        onSuccess: (item) => {
          snackbar.showSuccess(t("raceColors.createSuccess"));
          navigate(`/race-colors/${item.id}`);
        },
        onError: (err: unknown) => {
          const message = getErrorMessage(err, t("raceColors.errorCreating"));
          setError(message);
          snackbar.showError(message);
        },
      },
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t("raceColors.newRaceColor")}
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
                  checked={active ?? true}
                  onChange={(e) => setValue("active", e.target.checked)}
                />
              }
              label={t("raceColors.status")}
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
                onClick={() => navigate("/race-colors")}
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
