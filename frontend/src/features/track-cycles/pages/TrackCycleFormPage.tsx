import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  InfoOutlined as InfoOutlinedIcon,
} from "@mui/icons-material";
import {
  useTrackCycle,
  useCreateTrackCycle,
  useUpdateTrackCycle,
} from "../hooks/useTrackCycles";
import { useContexts } from "../../contexts/hooks/useContexts";
import { useTracks } from "../../tracks/hooks/useTracks";
import { TrackCycleStatus } from "../../../types/track-cycle.types";
import { getErrorMessage } from "../../../utils/errorHandler";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorAlert from "../../../components/common/ErrorAlert";

const MANDATORY_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const formSchema = z
  .object({
    trackId: z.number().min(1, "Trilha é obrigatória"),
    contextId: z.number().min(1, "Contexto é obrigatório"),
    name: z
      .string()
      .min(1, "Nome é obrigatório")
      .max(100, "Nome deve ter no máximo 100 caracteres"),
    description: z.string().optional(),
    mandatorySlug: z
      .string()
      .max(80, "Máximo 80 caracteres")
      .refine(
        (s) => !s || MANDATORY_SLUG_REGEX.test(s),
        "Apenas letras minúsculas, números e hífens (ex.: formacao-inicial)",
      )
      .optional()
      .or(z.literal("")),
    status: z.nativeEnum(TrackCycleStatus),
    startDate: z.string().min(1, "Data de início é obrigatória"),
    endDate: z.string().min(1, "Data de término é obrigatória"),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "Data de término deve ser maior ou igual à data de início",
    path: ["endDate"],
  });

type FormData = z.infer<typeof formSchema>;

export default function TrackCycleFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [error, setError] = useState<string | null>(null);

  const {
    data: cycle,
    isLoading: isLoadingCycle,
    error: cycleError,
  } = useTrackCycle(id ? parseInt(id) : null);
  const { data: contextsResponse, isLoading: isLoadingContexts } =
    useContexts();
  const createMutation = useCreateTrackCycle();
  const updateMutation = useUpdateTrackCycle();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trackId: 0,
      contextId: 0,
      name: "",
      description: "",
      mandatorySlug: "",
      status: TrackCycleStatus.DRAFT,
      startDate: "",
      endDate: "",
    },
  });

  const contextId = watch("contextId");
  const { data: tracksData, isLoading: isLoadingTracks } = useTracks(contextId);

  // Debug: verificar dados das trilhas
  useEffect(() => {
    if (tracksData && contextId) {
      console.log(
        "📚 Trilhas carregadas para contexto",
        contextId,
        ":",
        tracksData,
      );
    }
  }, [tracksData, contextId]);

  // Carregar dados do ciclo ao editar
  useEffect(() => {
    if (cycle) {
      reset({
        trackId: cycle.track_id,
        contextId: cycle.context_id,
        name: cycle.name,
        description: cycle.description || "",
        mandatorySlug: cycle.mandatory_slug ?? "",
        status: cycle.status,
        startDate: cycle.start_date.split("T")[0],
        endDate: cycle.end_date.split("T")[0],
      });
    }
  }, [cycle, reset]);

  // Resetar trilha quando contexto mudar
  useEffect(() => {
    if (!isEditing && contextId) {
      setValue("trackId", 0);
    }
  }, [contextId, isEditing, setValue]);

  const onSubmit = (data: FormData) => {
    setError(null);

    const cycleData = {
      trackId: data.trackId,
      contextId: data.contextId,
      name: data.name,
      description: data.description?.trim() || undefined,
      mandatorySlug: data.mandatorySlug?.trim() || (isEditing ? "" : undefined),
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
    };

    if (isEditing && id) {
      updateMutation.mutate(
        { id: parseInt(id), data: cycleData },
        {
          onSuccess: () => {
            navigate("/admin/track-cycles");
          },
          onError: (err) => {
            setError(getErrorMessage(err));
          },
        },
      );
    } else {
      createMutation.mutate(cycleData, {
        onSuccess: () => {
          navigate("/admin/track-cycles");
        },
        onError: (err) => {
          setError(getErrorMessage(err));
        },
      });
    }
  };

  if (isLoadingCycle || isLoadingContexts) return <LoadingSpinner />;
  if (cycleError)
    return (
      <ErrorAlert
        message={
          cycleError instanceof Error
            ? cycleError.message
            : "Erro ao carregar ciclo"
        }
      />
    );

  const contexts = contextsResponse?.data || [];
  const tracks = tracksData || []; // tracksData já é o array, não precisa acessar .data

  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/admin/track-cycles")}
        sx={{ mb: 2 }}
      >
        Voltar
      </Button>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {isEditing ? "Editar Ciclo" : "Novo Ciclo"}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>
            {/* Contexto */}
            <Controller
              name="contextId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={contexts}
                  getOptionLabel={(option: any) => option.name || ""}
                  value={
                    contexts.find((c: any) => c.id === field.value) || null
                  }
                  onChange={(_, newValue) => {
                    field.onChange(newValue?.id || 0);
                  }}
                  disabled={isEditing}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Contexto *"
                      error={!!errors.contextId}
                      helperText={errors.contextId?.message}
                    />
                  )}
                  noOptionsText="Nenhum contexto encontrado"
                />
              )}
            />

            {/* Trilha */}
            <Controller
              name="trackId"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Autocomplete
                  {...field}
                  options={tracks}
                  getOptionLabel={(option: any) => option.name || ""}
                  value={tracks.find((t: any) => t.id === value) || null}
                  onChange={(_, newValue) => {
                    onChange(newValue?.id || 0);
                  }}
                  disabled={isEditing || !contextId}
                  loading={isLoadingTracks}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Trilha *"
                      error={!!errors.trackId}
                      helperText={
                        errors.trackId?.message ||
                        (!contextId ? "Selecione um contexto primeiro" : "")
                      }
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoadingTracks ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  noOptionsText={
                    !contextId
                      ? "Selecione um contexto primeiro"
                      : isLoadingTracks
                        ? "Carregando trilhas..."
                        : "Nenhuma trilha encontrada neste contexto"
                  }
                />
              )}
            />

            {/* Nome do Ciclo */}
            <TextField
              label="Nome do Ciclo *"
              placeholder="Ex: 2026.1, Primeiro Semestre, Turma A"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register("name")}
              fullWidth
            />

            {/* Descrição */}
            <TextField
              label="Descrição"
              placeholder="Descrição opcional do ciclo"
              error={!!errors.description}
              helperText={errors.description?.message}
              {...register("description")}
              multiline
              rows={3}
              fullWidth
            />

            {/* Slug obrigatório */}
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{ mb: 0.5 }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="span"
                >
                  Slug obrigatório
                </Typography>
                <Tooltip
                  title="Identificador único que marca este ciclo como trilha obrigatória no contexto. Só pode existir um ciclo com o mesmo slug em todo o sistema. Deixe em branco se este ciclo não for obrigatório. Ex.: formacao-inicial, boas-vidas"
                  placement="top"
                  arrow
                >
                  <IconButton size="small" sx={{ p: 0.25 }}>
                    <InfoOutlinedIcon fontSize="small" color="action" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <TextField
                placeholder="Ex.: formacao-inicial (deixe vazio se não for obrigatório)"
                error={!!errors.mandatorySlug}
                helperText={errors.mandatorySlug?.message}
                {...register("mandatorySlug")}
                fullWidth
                size="small"
              />
            </Box>

            {/* Status */}
            <FormControl error={!!errors.status} fullWidth>
              <InputLabel>Status *</InputLabel>
              <Select
                label="Status *"
                value={watch("status")}
                onChange={(e) =>
                  setValue("status", e.target.value as TrackCycleStatus)
                }
              >
                <MenuItem value={TrackCycleStatus.DRAFT}>Rascunho</MenuItem>
                <MenuItem value={TrackCycleStatus.ACTIVE}>Ativo</MenuItem>
                <MenuItem value={TrackCycleStatus.CLOSED}>Encerrado</MenuItem>
                <MenuItem value={TrackCycleStatus.ARCHIVED}>Arquivado</MenuItem>
              </Select>
              {errors.status && (
                <FormHelperText>{errors.status.message}</FormHelperText>
              )}
            </FormControl>

            {/* Datas */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Data de Início *"
                type="date"
                error={!!errors.startDate}
                helperText={errors.startDate?.message}
                {...register("startDate")}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              <TextField
                label="Data de Término *"
                type="date"
                error={!!errors.endDate}
                helperText={errors.endDate?.message}
                {...register("endDate")}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>

            {/* Botões */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => navigate("/admin/track-cycles")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending || updateMutation.isPending}
                startIcon={
                  (createMutation.isPending || updateMutation.isPending) && (
                    <CircularProgress size={20} />
                  )
                }
              >
                {isEditing ? "Salvar" : "Criar"}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
