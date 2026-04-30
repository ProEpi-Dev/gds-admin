import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../../../contexts/AuthContext";
import { reportsService } from "../../../api/services/reports.service";
import type { Report } from "../../../types/report.types";
import { formsService } from "../../../api/services/forms.service";
import type {
  FormBuilderDefinition,
  FormField,
} from "../../../types/form-builder.types";
import { hasModule, resolveEnabledModules } from "../utils/contextModules";
import {
  useIntegrationEventByReport,
  useIntegrationMessages,
  useSendIntegrationMessage,
} from "../../report-integrations/hooks/useReportIntegrations";
import { filterEchoInboundMessages } from "../../report-integrations/utils/filterEchoInboundMessages";

type SignalFieldMeta = {
  label: string;
  options: Map<string, string>;
  field: FormField;
};

function formatLocationObject(value: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(value)) {
    if (val === null || val === undefined || val === "") continue;
    if (typeof val === "object" && !Array.isArray(val)) {
      const inner = formatLocationObject(val as Record<string, unknown>);
      if (inner !== "-") parts.push(`${key}: ${inner}`);
    } else {
      parts.push(`${key}: ${String(val)}`);
    }
  }
  return parts.length > 0 ? parts.join(" | ") : "-";
}

function formatSignalFieldValue(value: unknown, field: FormField): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (field.type === "boolean") {
    return value ? "Sim" : "Não";
  }
  if (field.type === "multiselect" && Array.isArray(value)) {
    return value
      .map((v) => {
        const option = field.options?.find((opt) => opt.value === v);
        return option ? option.label : String(v);
      })
      .join(", ");
  }
  if (field.type === "select") {
    const option = field.options?.find((opt) => opt.value === value);
    return option ? option.label : String(value);
  }
  if (field.type === "date" && value) {
    return new Date(value as string | number | Date).toLocaleDateString("pt-BR");
  }
  if (
    field.type === "mapPoint" &&
    value &&
    typeof value === "object" &&
    typeof (value as { latitude?: unknown }).latitude === "number" &&
    typeof (value as { longitude?: unknown }).longitude === "number"
  ) {
    const lat = (value as { latitude: number }).latitude;
    const lng = (value as { longitude: number }).longitude;
    return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  }
  if (field.type === "location" && value && typeof value === "object") {
    const cfg = field.locationConfig;
    if (cfg) {
      const rec = value as Record<string, unknown>;
      const parts: string[] = [];
      for (const key of [
        cfg.countryNameKey,
        cfg.stateDistrictNameKey,
        cfg.cityCouncilNameKey,
      ]) {
        if (!key) continue;
        const v = rec[key];
        if (v !== null && v !== undefined && v !== "") parts.push(String(v));
      }
      if (parts.length > 0) return parts.join(" · ");
    }
    return formatLocationObject(value as Record<string, unknown>);
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return formatLocationObject(value as Record<string, unknown>);
  }
  return String(value);
}

function buildSignalFieldMeta(
  definition: FormBuilderDefinition | null,
): Record<string, SignalFieldMeta> {
  if (!definition?.fields || !Array.isArray(definition.fields)) {
    return {};
  }
  const byName: Record<string, SignalFieldMeta> = {};
  for (const field of definition.fields) {
    const options = new Map<string, string>();
    for (const option of field.options ?? []) {
      options.set(String(option.value), option.label);
    }
    byName[field.name] = {
      label: field.label || field.name,
      options,
      field,
    };
  }
  return byName;
}

function formatSignalValue(value: unknown, meta?: SignalFieldMeta): string {
  if (!meta) {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object" && !Array.isArray(value)) {
      return formatLocationObject(value as Record<string, unknown>);
    }
    return String(value);
  }
  return formatSignalFieldValue(value, meta.field);
}

function buildSignalEntries(
  response: unknown,
  fieldMetaByName: Record<string, SignalFieldMeta>,
): Array<{ label: string; value: string }> {
  if (!response || typeof response !== "object") return [];
  const payload = response as Record<string, unknown>;
  return Object.entries(payload)
    .filter(
      ([key, value]) =>
        key !== "_isValid" && value !== null && value !== undefined && value !== "",
    )
    .map(([key, value]) => {
      const meta = fieldMetaByName[key];
      return {
        label: meta?.label ?? key,
        value: formatSignalValue(value, meta),
      };
    });
}

export default function AppCommunitySignalsHistory() {
  const { user } = useAuth();
  const participation = user?.participation;
  const contextId = participation?.context.id;
  const participationId = participation?.id;
  const enabledModules = resolveEnabledModules(participation?.context.modules);
  const communitySignalEnabled = hasModule(enabledModules, "community_signal");
  const [selectedSignal, setSelectedSignal] = useState<Report | null>(null);
  const [messageText, setMessageText] = useState("");

  const { data: integrationEvent } = useIntegrationEventByReport(selectedSignal?.id ?? null);
  const { data: integrationMessages, isLoading: messagesLoading } =
    useIntegrationMessages(integrationEvent?.id ?? null);
  const visibleIntegrationMessages = useMemo(
    () => filterEchoInboundMessages(integrationMessages ?? []),
    [integrationMessages],
  );
  const sendMessageMutation = useSendIntegrationMessage();

  const handleSendMessage = () => {
    if (!integrationEvent || !messageText.trim()) return;
    sendMessageMutation.mutate(
      { eventId: integrationEvent.id, message: messageText.trim() },
      { onSuccess: () => setMessageText("") },
    );
  };

  const { data: signalsData, isLoading: signalsLoading } = useQuery({
    queryKey: ["app-signals-list", contextId, participationId, "NEGATIVE", "app"],
    queryFn: () =>
      reportsService.findAll({
        page: 1,
        pageSize: 100,
        active: true,
        contextId,
        participationId,
        reportType: "NEGATIVE",
        view: "app",
      }),
    enabled: Boolean(contextId && participationId && communitySignalEnabled),
  });

  const selectedReportId = selectedSignal?.id ?? null;

  const { data: reportDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["reports", selectedReportId, "detail"],
    queryFn: () => reportsService.findOne(selectedReportId!),
    enabled: Boolean(selectedReportId && communitySignalEnabled),
  });

  const { data: formsData } = useQuery({
    queryKey: ["app-signals-forms", contextId],
    queryFn: () =>
      formsService.findAll({
        contextId,
        type: "signal",
        page: 1,
        pageSize: 20,
        active: true,
      }),
    enabled: Boolean(
      contextId && communitySignalEnabled && Boolean(selectedSignal?.id),
    ),
  });

  const allSignals = signalsData?.data ?? [];
  const signalFormDefinition = useMemo(() => {
    const forms = formsData?.data ?? [];
    for (const form of forms) {
      const latestDefinition =
        form?.latestVersion?.definition ?? form?.latest_version?.definition ?? null;
      if (latestDefinition) {
        return latestDefinition as FormBuilderDefinition;
      }
    }
    return null;
  }, [formsData]);
  const signalFieldMetaByName = useMemo(
    () => buildSignalFieldMeta(signalFormDefinition),
    [signalFormDefinition],
  );
  const detailFormResponse = reportDetail?.formResponse ?? selectedSignal?.formResponse;
  const selectedSignalEntries = useMemo(() => {
    if (!selectedSignal || selectedSignal.reportType !== "NEGATIVE") return [];
    if (
      detailFormResponse == null ||
      typeof detailFormResponse !== "object"
    )
      return [];
    return buildSignalEntries(detailFormResponse, signalFieldMetaByName);
  }, [
    selectedSignal,
    detailFormResponse,
    signalFieldMetaByName,
  ]);

  const integrationTrackingStatus =
    integrationEvent?.status ?? selectedSignal?.integrationSummary?.status ?? null;

  const stageLabel =
    integrationEvent?.externalSignalStageLabel ??
    selectedSignal?.integrationSummary?.externalSignalStageLabel ??
    null;

  if (!communitySignalEnabled) {
    return null;
  }

  return (
    <>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={700}>
          Meus Sinais
        </Typography>

        {!participationId && (
          <Alert severity="warning">
            Sua conta não possui participação ativa para visualizar os sinais.
          </Alert>
        )}

        {signalsLoading ? (
          <Stack sx={{ py: 2, alignItems: "center" }}>
            <CircularProgress size={22} />
          </Stack>
        ) : allSignals.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nenhum sinal com ocorrência informada até o momento.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {allSignals.map((signal: Report) => {
              const chipLabel =
                signal.integrationSummary?.externalSignalStageLabel ?? null;
              const linePreview =
                signal.previewText ?? "Sem detalhes adicionais.";
              return (
                <Paper
                  key={signal.id}
                  variant="outlined"
                  sx={{ p: 1.5, bgcolor: "background.default", cursor: "pointer" }}
                  onClick={() => setSelectedSignal(signal)}
                >
                  <Stack spacing={0.75} sx={{ mb: chipLabel ? 0.5 : 0 }}>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {format(new Date(signal.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </Typography>
                    {chipLabel ? (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        flexWrap="wrap"
                        useFlexGap
                        sx={{ width: "100%" }}
                      >
                        <Chip
                          size="small"
                          variant="outlined"
                          color="info"
                          label={chipLabel}
                        />
                      </Stack>
                    ) : null}
                  </Stack>
                  <Typography variant="body2">{linePreview}</Typography>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>

      <Dialog
        open={Boolean(selectedSignal)}
        onClose={() => setSelectedSignal(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Detalhes do sinal</DialogTitle>
        <DialogContent dividers>
          {selectedSignal && (
            <Stack spacing={1.5}>
              <Typography variant="caption" color="text.secondary">
                {format(new Date(selectedSignal.createdAt), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </Typography>
              {stageLabel ? (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    variant="outlined"
                    color="info"
                    sx={{ width: "fit-content" }}
                    label={stageLabel}
                  />
                </Stack>
              ) : null}
              {detailLoading ? (
                <Stack sx={{ py: 1, alignItems: "center" }}>
                  <CircularProgress size={22} />
                </Stack>
              ) : selectedSignalEntries.length === 0 ? (
                <Typography variant="body2">Sem detalhes adicionais.</Typography>
              ) : (
                <Stack spacing={1}>
                  {selectedSignalEntries.map((entry) => (
                    <Paper key={`${entry.label}-${entry.value}`} variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {entry.label}
                      </Typography>
                      <Typography variant="body2">{entry.value}</Typography>
                    </Paper>
                  ))}
                </Stack>
              )}

              {integrationTrackingStatus && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2">Acompanhamento</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={
                        integrationTrackingStatus === "sent"
                          ? "Enviado ao sistema externo"
                          : integrationTrackingStatus === "failed"
                            ? "Falha no envio"
                            : integrationTrackingStatus === "processing"
                              ? "Processando"
                              : "Pendente"
                      }
                      color={
                        integrationTrackingStatus === "sent"
                          ? "success"
                          : integrationTrackingStatus === "failed"
                            ? "error"
                            : "warning"
                      }
                    />
                    {stageLabel ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        color="info"
                        label={`Estado no sistema externo: ${stageLabel}`}
                      />
                    ) : null}
                  </Stack>

                  {integrationEvent?.externalEventId ? (
                    <>
                      <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        Mensagens
                      </Typography>
                      {messagesLoading ? (
                        <CircularProgress size={20} />
                      ) : visibleIntegrationMessages.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma mensagem ainda.
                        </Typography>
                      ) : (
                        <Stack spacing={0.5}>
                          {visibleIntegrationMessages.map((msg) => (
                            <Paper
                              key={msg.id}
                              variant="outlined"
                              sx={{
                                p: 1,
                                bgcolor:
                                  msg.direction === "outbound"
                                    ? "action.selected"
                                    : "background.default",
                              }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                {msg.direction === "inbound" ? "Recebida" : "Enviada"}
                                {msg.author ? ` por ${msg.author}` : ""} —{" "}
                                {format(new Date(msg.createdAt), "dd/MM HH:mm", {
                                  locale: ptBR,
                                })}
                              </Typography>
                              <Typography variant="body2">{msg.body}</Typography>
                            </Paper>
                          ))}
                        </Stack>
                      )}

                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Enviar mensagem..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <IconButton
                          color="primary"
                          onClick={handleSendMessage}
                          disabled={!messageText.trim() || sendMessageMutation.isPending}
                        >
                          <SendIcon />
                        </IconButton>
                      </Stack>
                    </>
                  ) : null}
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSelectedSignal(null);
              setMessageText("");
            }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
