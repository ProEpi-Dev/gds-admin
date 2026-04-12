import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  SentimentDissatisfiedOutlined as SentimentDissatisfiedOutlinedIcon,
  SentimentSatisfiedAltOutlined as SentimentSatisfiedAltOutlinedIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Checkbox,
  Chip,
} from "@mui/material";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../../../contexts/AuthContext";
import UserLayout from "../../../components/layout/UserLayout";
import ReportsMapView from "../../reports/components/ReportsMapView";
import { reportsService } from "../../../api/services/reports.service";
import { formsService } from "../../../api/services/forms.service";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { TrackProgressService } from "../../../api/services/track-progress.service";
import type { CreateReportDto } from "../../../types/report.types";
import type { ContextModuleCode } from "../../../types/context.types";
import FormRenderer from "../../../components/form-renderer/FormRenderer";
import { hasModule, resolveEnabledModules } from "../utils/contextModules";

const SYMPTOMS = [
  "Dor de cabeça",
  "Febre",
  "Dor no corpo",
  "Dor de garganta",
  "Coriza",
  "Tosse",
];

export default function AppHomePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const [openDialog, setOpenDialog] = useState(false);
  const [openSignalDialog, setOpenSignalDialog] = useState(false);
  const [sinceDate, setSinceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [communityCalendarMonth, setCommunityCalendarMonth] = useState(new Date());
  const [communitySignalResponse, setCommunitySignalResponse] = useState<
    Record<string, unknown>
  >({});
  const [selectedModule, setSelectedModule] = useState<ContextModuleCode | null>(null);
  const participation = user?.participation;
  const contextId = participation?.context.id;
  const participationId = participation?.id;
  const enabledModules = resolveEnabledModules(participation?.context.modules);
  const selfHealthEnabled = hasModule(enabledModules, "self_health");
  const communitySignalEnabled = hasModule(enabledModules, "community_signal");
  const activeModule =
    selectedModule && enabledModules.includes(selectedModule)
      ? selectedModule
      : enabledModules[0];
  const showSelfHealthMap = selfHealthEnabled && activeModule === "self_health";
  const communityMonthStart = startOfMonth(communityCalendarMonth);
  const communityMonthEnd = endOfMonth(communityCalendarMonth);
  const communityRangeStart = format(communityMonthStart, "yyyy-MM-dd");
  const communityRangeEnd = format(communityMonthEnd, "yyyy-MM-dd");

  const startDate = useMemo(() => format(subDays(new Date(), 30), "yyyy-MM-dd"), []);
  const endDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const { data: points = [], isLoading: pointsLoading } = useQuery({
    queryKey: ["app-home", "report-points", contextId, startDate, endDate],
    queryFn: () => reportsService.findPoints({ contextId, startDate, endDate }),
    enabled: Boolean(participationId && contextId && showSelfHealthMap),
  });

  const { data: formsData } = useQuery({
    queryKey: ["app-home", "signal-forms", contextId],
    queryFn: () =>
      formsService.findAll({
        contextId,
        type: "signal",
        page: 1,
        pageSize: 20,
        active: true,
      }),
    enabled: Boolean(contextId),
  });

  const { data: compliance, isLoading: complianceLoading } = useQuery({
    queryKey: ["mandatory-compliance", participationId],
    queryFn: () =>
      TrackProgressService.getMandatoryCompliance(participationId!).then(
        (r) => r.data,
      ),
    enabled: Boolean(participationId),
  });
  const { data: communityStreak, isLoading: communityStreakLoading } = useQuery({
    queryKey: [
      "app-home-community-days",
      contextId,
      participationId,
      communityRangeStart,
      communityRangeEnd,
    ],
    queryFn: () =>
      reportsService.findParticipationReportStreak(contextId!, participationId!, {
        startDate: communityRangeStart,
        endDate: communityRangeEnd,
      }),
    enabled: Boolean(
      contextId &&
        participationId &&
        communitySignalEnabled &&
        activeModule === "community_signal",
    ),
  });
  const pendingRequiredTracks = Math.max(
    0,
    (compliance?.totalRequired ?? 0) - (compliance?.completedCount ?? 0),
  );

  const signalFormVersionId = useMemo(() => {
    const forms = formsData?.data ?? [];
    for (const form of forms) {
      const latestVersionId =
        form?.latestVersion?.id ?? form?.latest_version?.id ?? null;
      if (typeof latestVersionId === "number") {
        return latestVersionId;
      }
    }
    return null;
  }, [formsData]);
  const signalFormDefinition = useMemo(() => {
    const forms = formsData?.data ?? [];
    for (const form of forms) {
      const latestDefinition =
        form?.latestVersion?.definition ?? form?.latest_version?.definition ?? null;
      if (latestDefinition) {
        return latestDefinition;
      }
    }
    return null;
  }, [formsData]);
  const communityReportedDaySet = useMemo(
    () => new Set((communityStreak?.reportedDays ?? []).map((row) => row.date)),
    [communityStreak],
  );
  const communityPositiveDaySet = useMemo(
    () =>
      new Set(
        (communityStreak?.reportedDays ?? [])
          .filter((row) => row.positiveCount > 0)
          .map((row) => row.date),
      ),
    [communityStreak],
  );
  const communityCalendarDays = useMemo(() => {
    const start = startOfWeek(communityMonthStart, { weekStartsOn: 0 });
    const end = endOfWeek(communityMonthEnd, { weekStartsOn: 0 });
    const next: Date[] = [];
    let day = start;
    while (day <= end) {
      next.push(day);
      day = addDays(day, 1);
    }
    return next;
  }, [communityMonthStart, communityMonthEnd]);
  const informedDaysCount = communityStreak?.reportedDaysInRangeCount ?? 0;
  const noSignalDaysCount = (communityStreak?.reportedDays ?? []).filter(
    (row) => row.positiveCount === 0 && row.negativeCount > 0,
  ).length;

  const createReportMutation = useMutation({
    mutationFn: (payload: CreateReportDto) => reportsService.create(payload),
    onSuccess: () => {
      snackbar.showSuccess("Report enviado com sucesso");
      setOpenDialog(false);
      setOpenSignalDialog(false);
      setSelectedSymptoms([]);
      setCommunitySignalResponse({});
      queryClient.invalidateQueries({ queryKey: ["app-home", "report-points"] });
      queryClient.invalidateQueries({ queryKey: ["app-days-streak"] });
      queryClient.invalidateQueries({ queryKey: ["app-home-community-days"] });
    },
    onError: () => {
      snackbar.showError("Não foi possível enviar o report");
    },
  });

  const canSubmit = Boolean(participationId && signalFormVersionId);

  const submitReport = (
    reportType: "POSITIVE" | "NEGATIVE",
    formResponse: Record<string, unknown> | null,
  ) => {
    if (!participationId || !signalFormVersionId) {
      snackbar.showError("Formulário de report não encontrado para o contexto.");
      return;
    }
    const payload: CreateReportDto = {
      participationId,
      formVersionId: signalFormVersionId,
      reportType,
      formResponse,
      active: true,
    };
    createReportMutation.mutate(payload);
  };

  const submitSelfHealthReport = (reportType: "POSITIVE" | "NEGATIVE") => {
    if (reportType === "NEGATIVE") {
      submitReport("NEGATIVE", null);
      return;
    }
    submitReport("POSITIVE", {
      mood: "MAL",
      sinceDate,
      symptoms: selectedSymptoms,
    });
  };

  const submitCommunitySignal = () => {
    const { _isValid, ...cleanFormResponse } = communitySignalResponse as Record<
      string,
      unknown
    >;
    if (!cleanFormResponse || Object.keys(cleanFormResponse).length === 0) {
      snackbar.showError("Preencha os dados do sinal antes de enviar.");
      return;
    }
    if (_isValid === false) {
      snackbar.showError("Revise os campos obrigatórios do formulário.");
      return;
    }
    submitReport("POSITIVE", cleanFormResponse);
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((item) => item !== symptom)
        : [...prev, symptom],
    );
  };

  return (
    <UserLayout>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={700}>
          Início
        </Typography>

        {!participationId && (
          <Alert severity="warning">
            Sua conta não possui participação ativa para registrar reports.
          </Alert>
        )}

        {!signalFormVersionId && participationId && (
          <Alert severity="warning">
            Não encontramos formulário de report ativo para seu contexto.
          </Alert>
        )}

        {enabledModules.length > 1 && (
          <Paper sx={{ p: 1 }}>
            <Stack direction="row" spacing={1}>
              {selfHealthEnabled && (
                <Button
                  variant={activeModule === "self_health" ? "contained" : "outlined"}
                  onClick={() => setSelectedModule("self_health")}
                  fullWidth
                >
                  Meu estado
                </Button>
              )}
              {communitySignalEnabled && (
                <Button
                  variant={
                    activeModule === "community_signal" ? "contained" : "outlined"
                  }
                  onClick={() => setSelectedModule("community_signal")}
                  fullWidth
                >
                  Sinal de alerta
                </Button>
              )}
            </Stack>
          </Paper>
        )}

        {showSelfHealthMap && (
          <Paper sx={{ p: 2 }}>
            {pointsLoading ? (
              <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <ReportsMapView points={points} height={340} showSummary={false} />
            )}
          </Paper>
        )}

        {activeModule === "self_health" && selfHealthEnabled && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Como está se sentindo hoje?
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={!canSubmit || createReportMutation.isPending}
                  onClick={() => submitSelfHealthReport("NEGATIVE")}
                  startIcon={<SentimentSatisfiedAltOutlinedIcon />}
                >
                  BEM
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  disabled={!canSubmit || createReportMutation.isPending}
                  onClick={() => setOpenDialog(true)}
                  startIcon={<SentimentDissatisfiedOutlinedIcon />}
                >
                  MAL
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {activeModule === "community_signal" && communitySignalEnabled && (
          <>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Quer informar um sinal de alerta?
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={!canSubmit || createReportMutation.isPending}
                    onClick={() => submitReport("NEGATIVE", null)}
                  >
                    Nada ocorreu
                  </Button>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={!canSubmit || createReportMutation.isPending}
                    onClick={() => setOpenSignalDialog(true)}
                  >
                    Informar
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Seus sinais e frequência
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                <Chip
                  color="primary"
                  label={`${informedDaysCount} dia(s) com registro no mês`}
                />
                <Chip
                  color="success"
                  variant="outlined"
                  label={`${noSignalDaysCount} dia(s) sem sinal`}
                />
              </Stack>

              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <IconButton
                  onClick={() =>
                    setCommunityCalendarMonth((prev) => subMonths(prev, 1))
                  }
                >
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="subtitle1" textTransform="capitalize">
                  {format(communityCalendarMonth, "MMMM yyyy", { locale: ptBR })}
                </Typography>
                <IconButton
                  onClick={() =>
                    setCommunityCalendarMonth((prev) => addMonths(prev, 1))
                  }
                >
                  <ChevronRightIcon />
                </IconButton>
              </Stack>

              {communityStreakLoading ? (
                <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => (
                    <Typography
                      key={`${label}-${index}`}
                      variant="caption"
                      color="primary.main"
                      align="center"
                      sx={{ fontWeight: 700 }}
                    >
                      {label}
                    </Typography>
                  ))}
                  {communityCalendarDays.map((day) => {
                    const iso = format(day, "yyyy-MM-dd");
                    const inMonth = isSameMonth(day, communityCalendarMonth);
                    const marked = communityReportedDaySet.has(iso);
                    const positiveDay = communityPositiveDaySet.has(iso);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <Box
                        key={iso}
                        sx={{
                          minHeight: 40,
                          borderRadius: 1,
                          border: 1,
                          borderColor: positiveDay
                            ? "error.main"
                            : marked
                              ? "success.main"
                              : isToday
                                ? "primary.main"
                                : "divider",
                          bgcolor: positiveDay
                            ? "error.light"
                            : marked
                              ? "success.light"
                              : "background.paper",
                          color: inMonth ? "text.primary" : "text.disabled",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: marked || isToday ? 700 : 500,
                          opacity: inMonth ? 1 : 0.6,
                        }}
                      >
                        {format(day, "d")}
                      </Box>
                    );
                  })}
                </Box>
              )}

            </Paper>
          </>
        )}

        {compliance && pendingRequiredTracks > 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Trilhas obrigatórias</Typography>
            {complianceLoading ? (
              <CircularProgress size={20} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {pendingRequiredTracks} pendente
                {pendingRequiredTracks === 1 ? "" : "s"} de {compliance.totalRequired}
              </Typography>
            )}
          </Paper>
        )}
      </Stack>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Estou me sentindo mal</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              type="date"
              label="Desde quando"
              value={sinceDate}
              onChange={(e) => setSinceDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Typography variant="subtitle2">Sintomas neste momento</Typography>
            <Box>
              {SYMPTOMS.map((symptom) => (
                <FormControlLabel
                  key={symptom}
                  control={
                    <Checkbox
                      checked={selectedSymptoms.includes(symptom)}
                      onChange={() => toggleSymptom(symptom)}
                    />
                  }
                  label={symptom}
                />
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => submitSelfHealthReport("POSITIVE")}
            disabled={!canSubmit || createReportMutation.isPending}
          >
            Enviar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openSignalDialog}
        onClose={() => setOpenSignalDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Informar sinal de alerta</DialogTitle>
        <DialogContent dividers>
          {!signalFormDefinition ? (
            <Alert severity="warning">
              Formulário de sinal não disponível para o seu contexto.
            </Alert>
          ) : (
            <FormRenderer
              definition={signalFormDefinition}
              initialValues={communitySignalResponse}
              onChange={(nextValues) =>
                setCommunitySignalResponse(nextValues as Record<string, unknown>)
              }
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSignalDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={submitCommunitySignal}
            disabled={
              !canSubmit ||
              createReportMutation.isPending ||
              !signalFormDefinition
            }
          >
            Enviar
          </Button>
        </DialogActions>
      </Dialog>
    </UserLayout>
  );
}

