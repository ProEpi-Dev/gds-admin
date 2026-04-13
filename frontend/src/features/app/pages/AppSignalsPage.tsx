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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";
import UserLayout from "../../../components/layout/UserLayout";
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
  useIntegrationEventsByParticipation,
  useIntegrationMessages,
  useSendIntegrationMessage,
} from "../../report-integrations/hooks/useReportIntegrations";
import type { IntegrationEvent } from "../../../api/services/report-integrations.service";

type SignalFieldMeta = {
  label: string;
  options: Map<string, string>;
  field: FormField;
};

/** Evita [object Object] em valores de localização com objetos aninhados. */
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

function summarizeSignalResponse(
  response: unknown,
  fieldMetaByName: Record<string, SignalFieldMeta>,
  definition: FormBuilderDefinition | null,
): string {
  if (!response || typeof response !== "object") {
    return "Sem detalhes adicionais.";
  }
  const payload = response as Record<string, unknown>;
  const previewName = definition?.listPreviewFieldName?.trim();
  if (previewName) {
    const value = payload[previewName];
    const meta = fieldMetaByName[previewName];
    const hasValue =
      value !== null && value !== undefined && value !== "";
    if (hasValue) {
      return formatSignalValue(value, meta);
    }
    return "—";
  }
  const symptoms = Array.isArray(payload.symptoms)
    ? payload.symptoms.filter((item) => typeof item === "string")
    : [];
  if (symptoms.length > 0) {
    return `Sintomas: ${symptoms.join(", ")}.`;
  }
  const fields = Object.entries(payload).filter(
    ([key, value]) =>
      key !== "_isValid" && value !== null && value !== undefined && value !== "",
  );
  if (fields.length === 0) {
    return "Sem detalhes adicionais.";
  }
  return fields
    .slice(0, 2)
    .map(([key, value]) => {
      const meta = fieldMetaByName[key];
      return formatSignalValue(value, meta);
    })
    .join(" · ");
}

function integrationListChip(
  status: IntegrationEvent["status"],
): { label: string; color: "success" | "error" | "warning" | "default" } {
  switch (status) {
    case "sent":
      return { label: "Enviado (integração)", color: "success" };
    case "failed":
      return { label: "Falha no envio", color: "error" };
    case "processing":
      return { label: "Processando envio", color: "warning" };
    default:
      return { label: "Envio pendente", color: "default" };
  }
}

export default function AppSignalsPage() {
  const { user } = useAuth();
  const participation = user?.participation;
  const contextId = participation?.context.id;
  const participationId = participation?.id;
  const enabledModules = resolveEnabledModules(participation?.context.modules);
  const communitySignalEnabled = hasModule(enabledModules, "community_signal");
  const [selectedSignal, setSelectedSignal] = useState<Report | null>(null);
  const [messageText, setMessageText] = useState("");
  const [signalFilter, setSignalFilter] = useState<"all" | "POSITIVE" | "NEGATIVE">(
    "all",
  );

  const { data: integrationEvent } = useIntegrationEventByReport(selectedSignal?.id ?? null);
  const { data: integrationEventsForParticipation } =
    useIntegrationEventsByParticipation(
      participationId && communitySignalEnabled ? participationId : null,
    );
  const { data: integrationMessages, isLoading: messagesLoading } =
    useIntegrationMessages(integrationEvent?.id ?? null);
  const sendMessageMutation = useSendIntegrationMessage();

  const handleSendMessage = () => {
    if (!integrationEvent || !messageText.trim()) return;
    sendMessageMutation.mutate(
      { eventId: integrationEvent.id, message: messageText.trim() },
      { onSuccess: () => setMessageText("") },
    );
  };

  const { data: signalsData, isLoading: signalsLoading } = useQuery({
    queryKey: ["app-signals-list", contextId, participationId],
    queryFn: () =>
      reportsService.findAll({
        page: 1,
        pageSize: 100,
        active: true,
        contextId,
        participationId,
      }),
    enabled: Boolean(contextId && participationId && communitySignalEnabled),
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
    enabled: Boolean(contextId && communitySignalEnabled),
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
  const selectedSignalEntries = useMemo(
    () =>
      selectedSignal && selectedSignal.reportType === "POSITIVE"
        ? buildSignalEntries(selectedSignal.formResponse, signalFieldMetaByName)
        : [],
    [selectedSignal, signalFieldMetaByName],
  );

  const integrationEventByReportId = useMemo(() => {
    const m = new Map<number, IntegrationEvent>();
    for (const ev of integrationEventsForParticipation ?? []) {
      if (!m.has(ev.reportId)) m.set(ev.reportId, ev);
    }
    return m;
  }, [integrationEventsForParticipation]);

  const filteredSignals = useMemo(() => {
    if (signalFilter === "all") return allSignals;
    return allSignals.filter((s) => s.reportType === signalFilter);
  }, [allSignals, signalFilter]);

  if (!communitySignalEnabled) {
    return <Navigate to="/app/inicio" replace />;
  }

  return (
    <UserLayout>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={700}>
          Meus sinais
        </Typography>

        {!participationId && (
          <Alert severity="warning">
            Sua conta não possui participação ativa para visualizar os sinais.
          </Alert>
        )}

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Filtrar por tipo
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={signalFilter}
            onChange={(_, value) => {
              if (value != null) setSignalFilter(value);
            }}
            aria-label="Filtro de sinais"
          >
            <ToggleButton value="all">Todos</ToggleButton>
            <ToggleButton value="POSITIVE">Com sinal</ToggleButton>
            <ToggleButton value="NEGATIVE">Nada ocorreu</ToggleButton>
          </ToggleButtonGroup>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Histórico de sinais
          </Typography>
          {signalsLoading ? (
            <Stack sx={{ py: 2, alignItems: "center" }}>
              <CircularProgress size={22} />
            </Stack>
          ) : allSignals.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum sinal enviado até o momento.
            </Typography>
          ) : filteredSignals.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum sinal neste filtro.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {filteredSignals.map((signal: Report) => {
                const integ =
                  signal.reportType === "POSITIVE"
                    ? integrationEventByReportId.get(signal.id)
                    : undefined;
                const integChip = integ ? integrationListChip(integ.status) : null;
                return (
                  <Paper
                    key={signal.id}
                    variant="outlined"
                    sx={{ p: 1.5, bgcolor: "background.default", cursor: "pointer" }}
                    onClick={() => setSelectedSignal(signal)}
                  >
                    <Stack spacing={0.75} sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" component="div">
                        {format(new Date(signal.createdAt), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        flexWrap="wrap"
                        useFlexGap
                        sx={{ width: "100%" }}
                      >
                        <Chip
                          size="small"
                          color={signal.reportType === "POSITIVE" ? "error" : "success"}
                          label={
                            signal.reportType === "POSITIVE" ? "Com sinal" : "Nada ocorreu"
                          }
                        />
                        {integChip && (
                          <Chip
                            size="small"
                            variant="outlined"
                            color={integChip.color}
                            label={integChip.label}
                          />
                        )}
                        {integ?.externalSignalStageLabel ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            color="info"
                            label={integ.externalSignalStageLabel}
                          />
                        ) : null}
                      </Stack>
                    </Stack>
                    <Typography variant="body2">
                      {signal.reportType === "POSITIVE"
                        ? summarizeSignalResponse(
                            signal.formResponse,
                            signalFieldMetaByName,
                            signalFormDefinition,
                          )
                        : "Sem sinal informado neste dia."}
                    </Typography>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Paper>
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
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  color={selectedSignal.reportType === "POSITIVE" ? "error" : "success"}
                  label={
                    selectedSignal.reportType === "POSITIVE"
                      ? "Com sinal"
                      : "Nada ocorreu"
                  }
                  sx={{ width: "fit-content" }}
                />
                {integrationEvent && (
                  <Chip
                    size="small"
                    variant="outlined"
                    sx={{ width: "fit-content" }}
                    color={integrationListChip(integrationEvent.status).color}
                    label={integrationListChip(integrationEvent.status).label}
                  />
                )}
                {integrationEvent?.externalSignalStageLabel ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    color="info"
                    sx={{ width: "fit-content" }}
                    label={integrationEvent.externalSignalStageLabel}
                  />
                ) : null}
              </Stack>
              {selectedSignal.reportType === "NEGATIVE" ? (
                <Typography variant="body2">Sem sinal informado neste dia.</Typography>
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

              {integrationEvent && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2">
                    Acompanhamento
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={
                        integrationEvent.status === "sent"
                          ? "Enviado ao sistema externo"
                          : integrationEvent.status === "failed"
                            ? "Falha no envio"
                            : integrationEvent.status === "processing"
                              ? "Processando"
                              : "Pendente"
                      }
                      color={
                        integrationEvent.status === "sent"
                          ? "success"
                          : integrationEvent.status === "failed"
                            ? "error"
                            : "warning"
                      }
                    />
                    {integrationEvent.externalSignalStageLabel ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        color="info"
                        label={`Estado no sistema externo: ${integrationEvent.externalSignalStageLabel}`}
                      />
                    ) : null}
                  </Stack>

                  {integrationEvent.externalEventId && (
                    <>
                      <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        Mensagens
                      </Typography>
                      {messagesLoading ? (
                        <CircularProgress size={20} />
                      ) : !integrationMessages || integrationMessages.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma mensagem ainda.
                        </Typography>
                      ) : (
                        <Stack spacing={0.5}>
                          {integrationMessages.map((msg) => (
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
                  )}
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
    </UserLayout>
  );
}
