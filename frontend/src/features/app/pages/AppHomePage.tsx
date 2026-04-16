import { useMemo, useRef, useState } from "react";
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
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
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
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import UserLayout from "../../../components/layout/UserLayout";
import ReportsMapView from "../../reports/components/ReportsMapView";
import { reportsService } from "../../../api/services/reports.service";
import { formsService } from "../../../api/services/forms.service";
import { usersService } from "../../../api/services/users.service";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { TrackProgressService } from "../../../api/services/track-progress.service";
import type { CreateReportDto } from "../../../types/report.types";
import FormRenderer, {
  type FormRendererHandle,
} from "../../../components/form-renderer/FormRenderer";
import { hasModule, resolveEnabledModules } from "../utils/contextModules";
import { useUserRole } from "../../../hooks/useUserRole";
import { useTranslation } from "../../../hooks/useTranslation";

function getRoleLabel(
  isAdmin: boolean,
  isManager: boolean,
  isContentManager: boolean,
  isParticipant: boolean,
): string {
  if (isAdmin) return "Administrador";
  if (isManager) return "Gerente";
  if (isContentManager) return "Gerente de Conteúdo";
  if (isParticipant) return "Participante";
  return "Sem papel";
}

const SYMPTOMS = [
  "Dor de cabeça",
  "Febre",
  "Dor no corpo",
  "Dor de garganta",
  "Coriza",
  "Tosse",
];

/** Paleta dos botões de humor / sinal (referência visual do app) */
const APP_MOOD_BLUE = "#4299C8";
const APP_MOOD_BLUE_HOVER = "#3a87b0";
const APP_MOOD_ORANGE = "#E1930D";
const APP_MOOD_ORANGE_HOVER = "#c9850b";

const moodButtonBaseSx = {
  py: 1.75,
  borderRadius: 2.5,
  fontWeight: 700,
  fontSize: "0.95rem",
  letterSpacing: 0.4,
  color: "#FFFFFF",
  boxShadow: "none",
  textTransform: "uppercase" as const,
  "&:hover": { boxShadow: "none" },
  "&.Mui-disabled": {
    opacity: 0.55,
    color: "#FFFFFF",
  },
};

const moodBlueButtonSx = {
  ...moodButtonBaseSx,
  bgcolor: APP_MOOD_BLUE,
  "&:hover": { bgcolor: APP_MOOD_BLUE_HOVER, boxShadow: "none" },
};

const moodOrangeButtonSx = {
  ...moodButtonBaseSx,
  bgcolor: APP_MOOD_ORANGE,
  "&:hover": { bgcolor: APP_MOOD_ORANGE_HOVER, boxShadow: "none" },
};

export default function AppHomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdmin, isManager, isContentManager, isParticipant, isLoading: roleLoading } =
    useUserRole();
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
  const communitySignalFormRef = useRef<FormRendererHandle>(null);
  const participation = user?.participation;
  const contextId = participation?.context.id;
  const participationId = participation?.id;
  const enabledModules = resolveEnabledModules(participation?.context.modules);
  const selfHealthEnabled = hasModule(enabledModules, "self_health");
  const communitySignalEnabled = hasModule(enabledModules, "community_signal");
  const activeModule = enabledModules[0] ?? "self_health";
  const showSelfHealthMap = selfHealthEnabled && activeModule === "self_health";
  const communityMonthStart = startOfMonth(communityCalendarMonth);
  const communityMonthEnd = endOfMonth(communityCalendarMonth);
  const communityRangeStart = format(communityMonthStart, "yyyy-MM-dd");
  const communityRangeEnd = format(communityMonthEnd, "yyyy-MM-dd");

  /** Janela do mapa de reports (self_health): 1 semana; poucos pontos no mapa inicial para aliviar payload e render. */
  const startDate = useMemo(() => format(subDays(new Date(), 7), "yyyy-MM-dd"), []);
  const endDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const homeMapPointsLimit = 500;

  const { data: points = [], isLoading: pointsLoading } = useQuery({
    queryKey: [
      "app-home",
      "report-points",
      contextId,
      startDate,
      endDate,
      homeMapPointsLimit,
    ],
    queryFn: () =>
      reportsService.findPoints({
        contextId,
        startDate,
        endDate,
        limit: homeMapPointsLimit,
      }),
    enabled: Boolean(participationId && contextId && showSelfHealthMap),
  });

  const { data: formsData, isPending: signalFormsLoading } = useQuery({
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

  const { data: profileStatus } = useQuery({
    queryKey: ["profile-status"],
    queryFn: () => usersService.getProfileStatus(),
    enabled: Boolean(participationId),
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
  /** Evita alerta falso e botões cinza enquanto a lista de formulários ainda carrega. */
  const signalFormsReady = !contextId || !signalFormsLoading;

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
      communitySignalFormRef.current?.revealFieldErrors();
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
      <Stack spacing={0}>
        {(!participationId ||
          (participationId && signalFormsReady && !signalFormVersionId)) && (
          <Box sx={{ px: 2, pt: 1, pb: 1 }}>
            <Stack spacing={2}>
              {!participationId && (
                <Alert severity="warning">
                  Sua conta não possui participação ativa para registrar reports.
                </Alert>
              )}
              {!signalFormVersionId && participationId && signalFormsReady && (
                <Alert severity="warning">
                  Não encontramos formulário de report ativo para seu contexto.
                </Alert>
              )}
            </Stack>
          </Box>
        )}

        {/* Faixa superior: largura total do Container (Início sem gutters) */}
        <Box
          sx={{
            width: "100%",
            boxSizing: "border-box",
            pt: 2,
            pb: 4.5,
            px: 2,
            borderRadius: "0 0 20px 20px",
            bgcolor: "primary.main",
            color: "primary.contrastText",
          }}
        >
          <Typography
            variant="h6"
            fontWeight={700}
            component="h1"
            sx={{ wordBreak: "break-word", lineHeight: 1.3 }}
          >
            Olá, {user?.name ?? "Participante"}
          </Typography>
          {roleLoading ? (
            <Skeleton
              variant="text"
              sx={{
                bgcolor: "rgba(255,255,255,0.22)",
                mt: 0.75,
                width: { xs: "70%", sm: 200 },
              }}
            />
          ) : (
            <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.5 }}>
              {getRoleLabel(
                isAdmin,
                isManager,
                isContentManager,
                isParticipant,
              )}
            </Typography>
          )}
        </Box>

        <Stack spacing={2} sx={{ px: 2, pt: 2, pb: 1 }}>
        {/* Cartão principal “flutuando” sobre a faixa */}
        {(selfHealthEnabled || communitySignalEnabled) && (
          <Paper
            elevation={6}
            sx={{
              mt: -3.5,
              position: "relative",
              zIndex: 1,
              borderRadius: 3,
              p: 2,
            }}
          >
            {activeModule === "self_health" && selfHealthEnabled && (
              <>
                <Typography variant="h6" sx={{ mb: 1.5 }} textAlign="center">
                  Como está se sentindo hoje?
                </Typography>
                {signalFormsLoading ? (
                  <Box
                    sx={{
                      py: 4,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary">
                      Carregando formulário…
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={!canSubmit || createReportMutation.isPending}
                        onClick={() => submitSelfHealthReport("NEGATIVE")}
                        startIcon={
                          <SentimentSatisfiedAltOutlinedIcon sx={{ color: "inherit" }} />
                        }
                        sx={{
                          ...moodBlueButtonSx,
                          "& .MuiButton-startIcon": { color: "inherit" },
                        }}
                      >
                        BEM
                      </Button>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={!canSubmit || createReportMutation.isPending}
                        onClick={() => setOpenDialog(true)}
                        startIcon={
                          <SentimentDissatisfiedOutlinedIcon sx={{ color: "inherit" }} />
                        }
                        sx={{
                          ...moodOrangeButtonSx,
                          "& .MuiButton-startIcon": { color: "inherit" },
                        }}
                      >
                        MAL
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </>
            )}

            {activeModule === "community_signal" && communitySignalEnabled && (
              <>
                <Typography variant="h6" sx={{ mb: 1.5 }} textAlign="center">
                  Quer informar um sinal de alerta?
                </Typography>
                {signalFormsLoading ? (
                  <Box
                    sx={{
                      py: 4,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary">
                      Carregando formulário…
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={!canSubmit || createReportMutation.isPending}
                        onClick={() => submitReport("NEGATIVE", null)}
                        sx={moodBlueButtonSx}
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
                        sx={moodOrangeButtonSx}
                      >
                        Informar
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </>
            )}
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

        {activeModule === "community_signal" && communitySignalEnabled && (
          <>
            <Paper
              component={RouterLink}
              to="/app/sinais"
              elevation={0}
              sx={{
                p: 2,
                display: "block",
                textDecoration: "none",
                color: "inherit",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                boxShadow: "none",
                transition: (theme) =>
                  theme.transitions.create(
                    ["background-color", "box-shadow"],
                    { duration: theme.transitions.duration.shortest },
                  ),
                "&:hover": {
                  bgcolor: "action.hover",
                  boxShadow: 1,
                },
                "&:focus-visible": {
                  outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Meus sinais informados
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Veja os sinais de alerta já informados por você.
                  </Typography>
                </Box>
                <ChevronRightIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
              </Stack>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Seus sinais e frequência
              </Typography>
              <Chip
                color="primary"
                label={`${informedDaysCount} dia(s) com registro no mês`}
                sx={{ mb: 2 }}
              />

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
                <Box>
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
                              ? "error.main"
                              : marked
                                ? "success.main"
                                : "background.paper",
                            color:
                              positiveDay || marked
                                ? "common.white"
                                : inMonth
                                  ? "text.primary"
                                  : "text.disabled",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: marked || positiveDay || isToday ? 700 : 500,
                            opacity: inMonth ? 1 : 0.6,
                          }}
                        >
                          {format(day, "d")}
                        </Box>
                      );
                    })}
                  </Box>
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={2}
                    justifyContent="center"
                    alignItems="center"
                    sx={{
                      pt: 1.5,
                      mt: 0.5,
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Box
                        sx={{
                          width: 11,
                          height: 11,
                          borderRadius: 0.75,
                          bgcolor: "error.main",
                          flexShrink: 0,
                          boxShadow: 1,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t("appHome.communityCalendarLegendSignal")}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Box
                        sx={{
                          width: 11,
                          height: 11,
                          borderRadius: 0.75,
                          bgcolor: "success.main",
                          flexShrink: 0,
                          boxShadow: 1,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t("appHome.communityCalendarLegendNothingOccurred")}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Paper>
          </>
        )}

        {compliance && pendingRequiredTracks > 0 && (
          <Paper
            component={RouterLink}
            to="/app/aprenda"
            elevation={0}
            sx={{
              p: 2,
              display: "block",
              textDecoration: "none",
              color: "inherit",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "none",
              transition: (theme) =>
                theme.transitions.create(["background-color", "box-shadow"], {
                  duration: theme.transitions.duration.shortest,
                }),
              "&:hover": {
                bgcolor: "action.hover",
                boxShadow: 1,
              },
              "&:focus-visible": {
                outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6">Trilhas obrigatórias</Typography>
                {complianceLoading ? (
                  <CircularProgress size={20} sx={{ mt: 0.5 }} />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {pendingRequiredTracks} pendente
                    {pendingRequiredTracks === 1 ? "" : "s"} de {compliance.totalRequired}
                  </Typography>
                )}
              </Box>
              <ChevronRightIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
            </Stack>
          </Paper>
        )}
        </Stack>
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
        onClose={() => {
          setOpenSignalDialog(false);
          communitySignalFormRef.current?.resetFieldErrors();
        }}
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
              ref={communitySignalFormRef}
              definition={signalFormDefinition}
              initialValues={communitySignalResponse}
              onChange={(nextValues) =>
                setCommunitySignalResponse(nextValues as Record<string, unknown>)
              }
              participantCountryLocationId={
                profileStatus?.profile.countryLocationId ?? null
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

