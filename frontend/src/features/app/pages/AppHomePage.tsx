import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { format, subDays } from "date-fns";
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
import AppCommunitySignalsHistory from "../components/AppCommunitySignalsHistory";

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
  const { user } = useAuth();
  const { isAdmin, isManager, isContentManager, isParticipant, isLoading: roleLoading } =
    useUserRole();
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const [openDialog, setOpenDialog] = useState(false);
  const [openSignalDialog, setOpenSignalDialog] = useState(false);
  const [selfHealthSignalResponse, setSelfHealthSignalResponse] = useState<
    Record<string, unknown>
  >({});
  const [communitySignalResponse, setCommunitySignalResponse] = useState<
    Record<string, unknown>
  >({});
  const selfHealthFormRef = useRef<FormRendererHandle>(null);
  const communitySignalFormRef = useRef<FormRendererHandle>(null);
  const participation = user?.participation;
  const contextId = participation?.context.id;
  const participationId = participation?.id;
  const enabledModules = resolveEnabledModules(participation?.context.modules);
  const selfHealthEnabled = hasModule(enabledModules, "self_health");
  const communitySignalEnabled = hasModule(enabledModules, "community_signal");
  const activeModule = enabledModules[0] ?? "self_health";
  const showSelfHealthMap = selfHealthEnabled && activeModule === "self_health";

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
  const createReportMutation = useMutation({
    mutationFn: (payload: CreateReportDto) => reportsService.create(payload),
    onSuccess: () => {
      snackbar.showSuccess("Report enviado com sucesso");
      setOpenDialog(false);
      setOpenSignalDialog(false);
      setSelfHealthSignalResponse({});
      setCommunitySignalResponse({});
      queryClient.invalidateQueries({ queryKey: ["app-home", "report-points"] });
      queryClient.invalidateQueries({ queryKey: ["app-days-streak"] });
      queryClient.invalidateQueries({ queryKey: ["app-home-community-days"] });
      queryClient.invalidateQueries({ queryKey: ["app-signals-list"] });
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

  const submitSelfHealthWellReport = () => {
    submitReport("POSITIVE", null);
  };

  const submitSelfHealthSignal = () => {
    const { _isValid, ...cleanFormResponse } = selfHealthSignalResponse as Record<
      string,
      unknown
    >;
    if (!cleanFormResponse || Object.keys(cleanFormResponse).length === 0) {
      snackbar.showError("Preencha os dados do sinal antes de enviar.");
      return;
    }
    if (_isValid === false) {
      selfHealthFormRef.current?.revealFieldErrors();
      snackbar.showError("Revise os campos obrigatórios do formulário.");
      return;
    }
    submitReport("NEGATIVE", cleanFormResponse);
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
    submitReport("NEGATIVE", cleanFormResponse);
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
                        onClick={submitSelfHealthWellReport}
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
                        onClick={() => submitReport("POSITIVE", null)}
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

        {communitySignalEnabled && <AppCommunitySignalsHistory />}

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
        </Stack>
      </Stack>

      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          selfHealthFormRef.current?.resetFieldErrors();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Estou me sentindo mal</DialogTitle>
        <DialogContent dividers>
          {!signalFormDefinition ? (
            <Alert severity="warning">
              Formulário de sinal não disponível para o seu contexto.
            </Alert>
          ) : (
            <FormRenderer
              ref={selfHealthFormRef}
              definition={signalFormDefinition}
              initialValues={selfHealthSignalResponse}
              onChange={(nextValues) =>
                setSelfHealthSignalResponse(nextValues as Record<string, unknown>)
              }
              participantCountryLocationId={
                profileStatus?.profile.countryLocationId ?? null
              }
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={submitSelfHealthSignal}
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

