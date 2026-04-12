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
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";
import UserLayout from "../../../components/layout/UserLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { reportsService } from "../../../api/services/reports.service";
import type { Report } from "../../../types/report.types";
import { formsService } from "../../../api/services/forms.service";
import type { FormBuilderDefinition } from "../../../types/form-builder.types";
import { hasModule, resolveEnabledModules } from "../utils/contextModules";

type SignalFieldMeta = {
  label: string;
  options: Map<string, string>;
};

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
    };
  }
  return byName;
}

function formatSignalValue(value: unknown, meta?: SignalFieldMeta): string {
  if (Array.isArray(value)) {
    const labels = value.map((item) => {
      const key = String(item);
      return meta?.options.get(key) ?? key;
    });
    return labels.join(", ");
  }
  if (value === null || value === undefined) return "-";
  const raw = String(value);
  return meta?.options.get(raw) ?? raw;
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
): string {
  if (!response || typeof response !== "object") {
    return "Sem detalhes adicionais.";
  }
  const payload = response as Record<string, unknown>;
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
      const label = meta?.label ?? key;
      return `${label}: ${formatSignalValue(value, meta)}`;
    })
    .join(" | ");
}

export default function AppSignalsPage() {
  const { user } = useAuth();
  const participation = user?.participation;
  const contextId = participation?.context.id;
  const participationId = participation?.id;
  const enabledModules = resolveEnabledModules(participation?.context.modules);
  const communitySignalEnabled = hasModule(enabledModules, "community_signal");
  const now = new Date();
  const rangeStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
  const rangeEnd = format(
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
    "yyyy-MM-dd",
  );
  const [selectedSignal, setSelectedSignal] = useState<Report | null>(null);

  const { data: streakData } = useQuery({
    queryKey: ["app-signals-streak", contextId, participationId, rangeStart, rangeEnd],
    queryFn: () =>
      reportsService.findParticipationReportStreak(contextId!, participationId!, {
        startDate: rangeStart,
        endDate: rangeEnd,
      }),
    enabled: Boolean(contextId && participationId && communitySignalEnabled),
  });

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
  const positiveCount = allSignals.filter((signal) => signal.reportType === "POSITIVE").length;
  const negativeCount = allSignals.filter((signal) => signal.reportType === "NEGATIVE").length;

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
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              color="primary"
              label={`${streakData?.reportedDaysInRangeCount ?? 0} dia(s) reportados no mês`}
            />
            <Chip color="error" variant="outlined" label={`${positiveCount} sinal(is) positivo(s)`} />
            <Chip color="success" variant="outlined" label={`${negativeCount} dia(s) sem ocorrência`} />
          </Stack>
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
          ) : (
            <Stack spacing={1}>
              {allSignals.map((signal: Report) => (
                <Paper
                  key={signal.id}
                  variant="outlined"
                  sx={{ p: 1.5, bgcolor: "background.default", cursor: "pointer" }}
                  onClick={() => setSelectedSignal(signal)}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(signal.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </Typography>
                    <Chip
                      size="small"
                      color={signal.reportType === "POSITIVE" ? "error" : "success"}
                      label={signal.reportType === "POSITIVE" ? "Com sinal" : "Nada ocorreu"}
                    />
                  </Stack>
                  <Typography variant="body2">
                    {signal.reportType === "POSITIVE"
                      ? summarizeSignalResponse(
                          signal.formResponse,
                          signalFieldMetaByName,
                        )
                      : "Sem sinal informado neste dia."}
                  </Typography>
                </Paper>
              ))}
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
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSignal(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </UserLayout>
  );
}
