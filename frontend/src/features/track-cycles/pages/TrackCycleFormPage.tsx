import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  CircularProgress,
  Divider,
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
import { useCurrentContext } from "../../../contexts/CurrentContextContext";
import { useTracks } from "../../tracks/hooks/useTracks";
import {
  TrackCycleStatus,
  type TrackCycleSectionSummary,
  type ReplaceTrackCycleSchedulesDto,
} from "../../../types/track-cycle.types";
import { getErrorMessage } from "../../../utils/errorHandler";
import { useSnackbar as useNotistackSnackbar } from "notistack";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorAlert from "../../../components/common/ErrorAlert";
import { TrackService } from "../../../api/services/track.service";
import { TrackCyclesService } from "../../../api/services/track-cycles.service";

function buildReplaceSchedulesPayload(
  sections: TrackCycleSectionSummary[],
  sectionDates: Record<number, { start: string; end: string }>,
  sequenceDates: Record<number, { start: string; end: string }>,
): ReplaceTrackCycleSchedulesDto {
  const sectionSchedules: ReplaceTrackCycleSchedulesDto["sectionSchedules"] =
    [];
  const sequenceSchedules: ReplaceTrackCycleSchedulesDto["sequenceSchedules"] =
    [];
  for (const sec of sections) {
    const d = sectionDates[sec.id];
    const start = d?.start?.trim() || null;
    const end = d?.end?.trim() || null;
    if (start || end) {
      sectionSchedules.push({
        sectionId: sec.id,
        startDate: start,
        endDate: end,
      });
    }
    for (const seq of sec.sequence ?? []) {
      const qd = sequenceDates[seq.id];
      const qs = qd?.start?.trim() || null;
      const qe = qd?.end?.trim() || null;
      if (qs || qe) {
        sequenceSchedules.push({
          sequenceId: seq.id,
          startDate: qs,
          endDate: qe,
        });
      }
    }
  }
  return { sectionSchedules, sequenceSchedules };
}

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

/** yyyy-mm-dd; string comparison is order-safe. */
function minIsoDate(a: string, b: string): string {
  return a <= b ? a : b;
}

function maxIsoDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function effectiveSectionWindow(
  sectionStart: string,
  sectionEnd: string,
  cycleStart: string,
  cycleEnd: string,
): { winStart: string; winEnd: string } {
  const s = sectionStart.trim();
  const e = sectionEnd.trim();
  let winStart = s || cycleStart;
  let winEnd = e || cycleEnd;
  if (winStart > winEnd) {
    winStart = cycleStart;
    winEnd = cycleEnd;
  }
  return { winStart, winEnd };
}

export default function TrackCycleFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { enqueueSnackbar } = useNotistackSnackbar();
  const [sectionDates, setSectionDates] = useState<
    Record<number, { start: string; end: string }>
  >({});
  const [sequenceDates, setSequenceDates] = useState<
    Record<number, { start: string; end: string }>
  >({});
  const [savingSchedules, setSavingSchedules] = useState(false);

  const queryClient = useQueryClient();
  const { currentContext } = useCurrentContext();
  const {
    data: cycle,
    isLoading: isLoadingCycle,
    error: cycleError,
  } = useTrackCycle(id ? parseInt(id) : null);
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
  const trackIdWatched = watch("trackId");
  const cycleStartDate = watch("startDate");
  const cycleEndDate = watch("endDate");
  const cycleDatesReady =
    Boolean(cycleStartDate?.trim()) && Boolean(cycleEndDate?.trim());
  const { data: tracksData, isLoading: isLoadingTracks } = useTracks(
    contextId && contextId > 0 ? contextId : undefined
  );

  const { data: trackForPlanning, isLoading: isLoadingTrackPlan } = useQuery({
    queryKey: ["tracks", trackIdWatched, "planning-structure"],
    queryFn: async () => {
      const res = await TrackService.get(trackIdWatched);
      return res.data as { section?: TrackCycleSectionSummary[] };
    },
    enabled: !isEditing && !!trackIdWatched && trackIdWatched > 0,
  });

  const sectionsForPlan = useMemo((): TrackCycleSectionSummary[] => {
    if (isEditing && cycle?.track?.section) {
      return cycle.track.section;
    }
    const sec = trackForPlanning?.section;
    return Array.isArray(sec) ? sec : [];
  }, [isEditing, cycle, trackForPlanning]);

  // Na criação, usar o contexto selecionado no cabeçalho da aplicação
  useEffect(() => {
    if (!isEditing && currentContext?.id) {
      setValue("contextId", currentContext.id);
    }
  }, [isEditing, currentContext?.id, setValue]);

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

  useEffect(() => {
    if (!cycle || !isEditing) return;
    const nextS: Record<number, { start: string; end: string }> = {};
    (cycle.track_cycle_section_schedule ?? []).forEach((row) => {
      nextS[row.section_id] = {
        start: row.start_date?.split("T")[0] ?? "",
        end: row.end_date?.split("T")[0] ?? "",
      };
    });
    setSectionDates(nextS);
    const nextQ: Record<number, { start: string; end: string }> = {};
    (cycle.track_cycle_sequence_schedule ?? []).forEach((row) => {
      nextQ[row.sequence_id] = {
        start: row.start_date?.split("T")[0] ?? "",
        end: row.end_date?.split("T")[0] ?? "",
      };
    });
    setSequenceDates(nextQ);
  }, [
    cycle?.id,
    isEditing,
    cycle?.track_cycle_section_schedule,
    cycle?.track_cycle_sequence_schedule,
  ]);

  useEffect(() => {
    if (isEditing) return;
    setSectionDates({});
    setSequenceDates({});
  }, [trackIdWatched, isEditing]);

  // Resetar trilha quando contexto mudar
  useEffect(() => {
    if (!isEditing && contextId) {
      setValue("trackId", 0);
    }
  }, [contextId, isEditing, setValue]);

  const onSubmit = async (data: FormData) => {
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

    try {
      let cycleId: number;
      if (isEditing && id) {
        await updateMutation.mutateAsync({
          id: parseInt(id, 10),
          data: cycleData,
        });
        cycleId = parseInt(id, 10);
      } else {
        const created = await createMutation.mutateAsync(cycleData);
        cycleId = created.id;
      }

      const payload = buildReplaceSchedulesPayload(
        sectionsForPlan,
        sectionDates,
        sequenceDates,
      );
      setSavingSchedules(true);
      try {
        await TrackCyclesService.replaceSchedules(cycleId, payload);
      } finally {
        setSavingSchedules(false);
      }

      await queryClient.invalidateQueries({ queryKey: ["track-cycles"] });
      await queryClient.invalidateQueries({
        queryKey: ["track-cycles", cycleId],
      });
      enqueueSnackbar("Ciclo salvo com sucesso.", { variant: "success" });
      navigate("/admin/track-cycles");
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err), {
        variant: "error",
        autoHideDuration: 14_000,
        style: { maxWidth: 520 },
      });
    }
  };

  if (isLoadingCycle) return <LoadingSpinner />;
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

  const tracks = tracksData || [];

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

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>
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
                        (!contextId && !isEditing
                          ? "Selecione um contexto no cabeçalho da aplicação"
                          : "")
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
                      ? "Selecione um contexto no cabeçalho da aplicação"
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

            {sectionsForPlan.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1" fontWeight="medium">
                  Planejamento opcional (por seção e por item)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Deixe em branco para herdar as datas do ciclo. As janelas são
                  aplicadas em cascata: ciclo → seção → conteúdo/quiz. Fuso de
                  referência: America/Sao_Paulo. Validação: cada item precisa
                  caber na janela efetiva da seção (ex.: término do item não pode
                  ser depois do fim da seção; datas antes do início da seção são
                  recortadas e podem deixar o período vazio).
                </Typography>
                {isLoadingTrackPlan && !isEditing ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : (
                  <Stack spacing={3}>
                    {sectionsForPlan
                      .slice()
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((sec) => {
                        const sRow = sectionDates[sec.id] ?? {
                          start: "",
                          end: "",
                        };
                        const sStart = sRow.start.trim();
                        const sEnd = sRow.end.trim();

                        let sectionStartMin = cycleStartDate;
                        let sectionStartMax = cycleEndDate;
                        let sectionEndMin = cycleStartDate;
                        let sectionEndMax = cycleEndDate;
                        if (cycleDatesReady) {
                          sectionStartMax = sEnd
                            ? minIsoDate(sEnd, cycleEndDate)
                            : cycleEndDate;
                          sectionEndMin = sStart
                            ? maxIsoDate(sStart, cycleStartDate)
                            : cycleStartDate;
                          if (sectionStartMin > sectionStartMax) {
                            sectionStartMax = cycleEndDate;
                          }
                          if (sectionEndMin > sectionEndMax) {
                            sectionEndMin = cycleStartDate;
                          }
                        }

                        const { winStart, winEnd } = cycleDatesReady
                          ? effectiveSectionWindow(
                              sRow.start,
                              sRow.end,
                              cycleStartDate,
                              cycleEndDate,
                            )
                          : { winStart: "", winEnd: "" };

                        return (
                        <Paper key={sec.id} variant="outlined" sx={{ p: 2 }}>
                          <Typography fontWeight="medium" gutterBottom>
                            {sec.name}
                          </Typography>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            sx={{ mb: 2 }}
                          >
                            <TextField
                              label="Início da seção (opcional)"
                              type="date"
                              value={sectionDates[sec.id]?.start ?? ""}
                              onChange={(e) =>
                                setSectionDates((p) => ({
                                  ...p,
                                  [sec.id]: {
                                    start: e.target.value,
                                    end: p[sec.id]?.end ?? "",
                                  },
                                }))
                              }
                              InputLabelProps={{ shrink: true }}
                              fullWidth
                              size="small"
                              inputProps={
                                cycleDatesReady
                                  ? {
                                      min: sectionStartMin,
                                      max: sectionStartMax,
                                    }
                                  : undefined
                              }
                            />
                            <TextField
                              label="Término da seção (opcional)"
                              type="date"
                              value={sectionDates[sec.id]?.end ?? ""}
                              onChange={(e) =>
                                setSectionDates((p) => ({
                                  ...p,
                                  [sec.id]: {
                                    start: p[sec.id]?.start ?? "",
                                    end: e.target.value,
                                  },
                                }))
                              }
                              InputLabelProps={{ shrink: true }}
                              fullWidth
                              size="small"
                              inputProps={
                                cycleDatesReady
                                  ? {
                                      min: sectionEndMin,
                                      max: sectionEndMax,
                                    }
                                  : undefined
                              }
                            />
                          </Stack>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mb: 1 }}
                          >
                            Itens nesta seção
                          </Typography>
                          <Stack spacing={2}>
                            {(sec.sequence ?? [])
                              .slice()
                              .sort(
                                (a, b) => (a.order ?? 0) - (b.order ?? 0),
                              )
                              .map((seq) => {
                                const label =
                                  seq.content?.title ??
                                  seq.form?.title ??
                                  (seq.content_id
                                    ? `Conteúdo #${seq.content_id}`
                                    : seq.form_id
                                      ? `Quiz #${seq.form_id}`
                                      : `Sequência #${seq.order + 1}`);
                                const qRow = sequenceDates[seq.id] ?? {
                                  start: "",
                                  end: "",
                                };
                                const qStart = qRow.start.trim();
                                const qEnd = qRow.end.trim();

                                let itemStartMin = winStart;
                                let itemStartMax = winEnd;
                                let itemEndMin = winStart;
                                let itemEndMax = winEnd;
                                if (cycleDatesReady) {
                                  itemStartMax = qEnd
                                    ? minIsoDate(qEnd, winEnd)
                                    : winEnd;
                                  itemEndMin = qStart
                                    ? maxIsoDate(qStart, winStart)
                                    : winStart;
                                  if (itemStartMin > itemStartMax) {
                                    itemStartMax = winEnd;
                                  }
                                  if (itemEndMin > itemEndMax) {
                                    itemEndMin = winStart;
                                  }
                                }

                                return (
                                  <Stack
                                    key={seq.id}
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={2}
                                    sx={{ pl: { sm: 1 } }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        minWidth: { sm: 200 },
                                        pt: { sm: 1 },
                                      }}
                                    >
                                      {label}
                                    </Typography>
                                    <TextField
                                      label="Início (opcional)"
                                      type="date"
                                      value={sequenceDates[seq.id]?.start ?? ""}
                                      onChange={(e) =>
                                        setSequenceDates((p) => ({
                                          ...p,
                                          [seq.id]: {
                                            start: e.target.value,
                                            end: p[seq.id]?.end ?? "",
                                          },
                                        }))
                                      }
                                      InputLabelProps={{ shrink: true }}
                                      size="small"
                                      fullWidth
                                      inputProps={
                                        cycleDatesReady
                                          ? {
                                              min: itemStartMin,
                                              max: itemStartMax,
                                            }
                                          : undefined
                                      }
                                    />
                                    <TextField
                                      label="Término (opcional)"
                                      type="date"
                                      value={sequenceDates[seq.id]?.end ?? ""}
                                      onChange={(e) =>
                                        setSequenceDates((p) => ({
                                          ...p,
                                          [seq.id]: {
                                            start: p[seq.id]?.start ?? "",
                                            end: e.target.value,
                                          },
                                        }))
                                      }
                                      InputLabelProps={{ shrink: true }}
                                      size="small"
                                      fullWidth
                                      inputProps={
                                        cycleDatesReady
                                          ? {
                                              min: itemEndMin,
                                              max: itemEndMax,
                                            }
                                          : undefined
                                      }
                                    />
                                  </Stack>
                                );
                              })}
                          </Stack>
                        </Paper>
                        );
                      })}
                  </Stack>
                )}
              </>
            )}

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
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  savingSchedules
                }
                startIcon={
                  (createMutation.isPending ||
                    updateMutation.isPending ||
                    savingSchedules) && <CircularProgress size={20} />
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
