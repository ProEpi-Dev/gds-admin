import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Stack,
  Select,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import MapIcon from "@mui/icons-material/Map";
import ReplayIcon from "@mui/icons-material/Replay";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { BarChart } from "@mui/x-charts/BarChart";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import {
  useDailySyndromeCounts,
  useReportSyndromeScores,
  useReprocessSyndromic,
  useSyndromicSyndromes,
} from "../hooks/useSyndromicClassification";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { useTranslation } from "../../../hooks/useTranslation";
import { useCurrentContext } from "../../../contexts/CurrentContextContext";
import { useUserRole } from "../../../hooks/useUserRole";
import { formatDateTimeFromApi } from "../../../utils/formatDateOnlyFromApi";
import { reportsService } from "../../../api/services/reports.service";
import type { ReportSyndromeScoreItem } from "../../../types/syndromic.types";
import type { ReportPoint } from "../../../types/report.types";
import ReportsMapView from "../../reports/components/ReportsMapView";

const CHART_COLORS = [
  "#0D47A1",
  "#2E7D32",
  "#C62828",
  "#6A1B9A",
  "#EF6C00",
  "#00838F",
  "#AD1457",
  "#558B2F",
];

/** Últimos 7 dias (inclusive), datas no fuso local para `<input type="date">`. */
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return { startDate: fmt(start), endDate: fmt(end) };
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Erro ao reprocessar";
  const maybeResponse = (error as { response?: { data?: { message?: unknown } } })
    .response;
  const maybeMessage = maybeResponse?.data?.message;
  return typeof maybeMessage === "string" ? maybeMessage : "Erro ao reprocessar";
}

const syndromicPercentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Valores 0–1 vindos da API (score / limiar) exibidos como percentual. */
function formatSyndromicPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  return syndromicPercentFormatter.format(n);
}

function humanizeFormKey(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function FormResponseValueChips({ value }: { value: unknown }): ReactNode {
  if (value === null || value === undefined) {
    return <Chip size="small" variant="outlined" label="—" />;
  }
  if (typeof value === "boolean") {
    return <Chip size="small" variant="outlined" label={value ? "Sim" : "Não"} />;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return <Chip size="small" variant="outlined" label={String(value)} />;
  }
  if (typeof value === "string") {
    return (
      <Chip size="small" variant="outlined" label={value || "—"} sx={{ maxWidth: "100%" }} />
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <Typography variant="caption" color="text.secondary">
          (vazio)
        </Typography>
      );
    }
    return (
      <>
        {value.map((item, i) => (
          <Fragment key={i}>
            {typeof item === "object" && item !== null ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 1,
                  width: "100%",
                  bgcolor: "grey.50",
                }}
              >
                <FormResponseFields data={item as Record<string, unknown>} nested />
              </Paper>
            ) : (
              <FormResponseValueChips value={item} />
            )}
          </Fragment>
        ))}
      </>
    );
  }
  if (typeof value === "object") {
    return <FormResponseFields data={value as Record<string, unknown>} nested />;
  }
  return <Chip size="small" variant="outlined" label={String(value)} />;
}

function FormResponseFields({
  data,
  nested,
}: {
  data: Record<string, unknown>;
  nested?: boolean;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        (vazio)
      </Typography>
    );
  }
  return (
    <Stack spacing={nested ? 1.25 : 2} sx={{ width: "100%", ...(nested ? { pl: 0.5 } : {}) }}>
      {entries.map(([key, val]) => (
        <Box key={key}>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mb: 0.5 }}
          >
            {humanizeFormKey(key)}
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.75,
              alignItems: "flex-start",
              width: "100%",
            }}
          >
            <FormResponseValueChips value={val} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function FormResponseBody({ formResponse }: { formResponse: unknown }) {
  if (formResponse === null || formResponse === undefined) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  if (typeof formResponse !== "object" || Array.isArray(formResponse)) {
    return <FormResponseValueChips value={formResponse} />;
  }
  return <FormResponseFields data={formResponse as Record<string, unknown>} />;
}

function ClassificationDetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>
        {label}
      </Typography>
      <Box sx={{ "& .MuiTypography-root": { wordBreak: "break-word" } }}>{children}</Box>
    </Box>
  );
}

export default function SyndromicReportsPage() {
  const snackbar = useSnackbar();
  const { currentLanguage } = useTranslation();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const canReprocess = isAdmin;
  const { currentContext } = useCurrentContext();
  const contextId = currentContext?.id;
  /** Admin: backend exige `contextId` na query (AuthzService.resolveListContextId). */
  const syndromicQueriesEnabled =
    !roleLoading && (isAdmin ? contextId != null : true);
  const [{ startDate, endDate }, setDateRange] = useState(getDefaultDateRange);
  /** Intervalo efetivo da última ação "Consultar" — inputs podem mudar sem refetch. */
  const [appliedRange, setAppliedRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [reprocessDialogOpen, setReprocessDialogOpen] = useState(false);
  /** Report alvo do reprocessamento unitário — abre diálogo de confirmação. */
  const [singleReprocessReportId, setSingleReprocessReportId] = useState<
    number | null
  >(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [scoreDetailRow, setScoreDetailRow] = useState<ReportSyndromeScoreItem | null>(
    null,
  );

  const reportDetailQuery = useQuery({
    queryKey: ["reports", "detail", scoreDetailRow?.reportId],
    queryFn: () => reportsService.findOne(scoreDetailRow!.reportId),
    enabled: scoreDetailRow != null,
  });

  const scoreDetailMapPoints = useMemo<ReportPoint[]>(() => {
    if (!scoreDetailRow?.occurrenceLocation) return [];
    const lat = scoreDetailRow.occurrenceLocation.latitude;
    const lng = scoreDetailRow.occurrenceLocation.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [
      {
        latitude: Number(lat),
        longitude: Number(lng),
        reportType: "POSITIVE",
      },
    ];
  }, [scoreDetailRow]);

  /** Filtros globais — aplicam em gráfico, tabela e mapa. */
  const [selectedSyndromeId, setSelectedSyndromeId] = useState<string>("");
  const [aboveThresholdFilter, setAboveThresholdFilter] = useState<
    "" | "true" | "false"
  >("true");
  const [statusFilter, setStatusFilter] = useState<
    "" | "processed" | "skipped" | "failed"
  >("");

  const [scoresPaginationModel, setScoresPaginationModel] =
    useState<GridPaginationModel>({ page: 0, pageSize: 50 });
  const [showAboveThresholdMap, setShowAboveThresholdMap] = useState(false);
  /**
   * Gráfico (totais diários) usa `onlyAboveThreshold` (boolean). Só faz sentido
   * "ligar" quando o usuário escolhe **acima=Sim** — nas demais opções, o gráfico
   * passa a contar todas as linhas (o backend não possui só-abaixo por design).
   */
  const chartOnlyAboveThreshold = aboveThresholdFilter === "true";
  const { data: syndromesData, isLoading: syndromesLoading } = useSyndromicSyndromes();
  const syndromeOptions = useMemo(
    () =>
      (syndromesData ?? [])
        .filter((s) => s.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [syndromesData],
  );

  useEffect(() => {
    setScoresPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [
    appliedRange,
    contextId,
    aboveThresholdFilter,
    statusFilter,
    selectedSyndromeId,
  ]);

  const dailyQuery = useMemo(
    () =>
      appliedRange
        ? {
            startDate: appliedRange.startDate,
            endDate: appliedRange.endDate,
            onlyAboveThreshold: chartOnlyAboveThreshold,
            ...(selectedSyndromeId !== ""
              ? { syndromeIds: [Number(selectedSyndromeId)] }
              : {}),
            ...(contextId != null ? { contextId } : {}),
          }
        : null,
    [appliedRange, contextId, chartOnlyAboveThreshold, selectedSyndromeId],
  );

  const scoreQuery = useMemo(
    () =>
      ({
        ...(appliedRange
          ? {
              startDate: appliedRange.startDate,
              endDate: appliedRange.endDate,
            }
          : {}),
        page: scoresPaginationModel.page + 1,
        pageSize: scoresPaginationModel.pageSize,
        onlyLatest: true,
        ...(contextId != null ? { contextId } : {}),
        ...(aboveThresholdFilter === "true"
          ? { isAboveThreshold: true }
          : aboveThresholdFilter === "false"
            ? { isAboveThreshold: false }
            : {}),
        ...(statusFilter !== "" ? { processingStatus: statusFilter } : {}),
        ...(selectedSyndromeId !== ""
          ? { syndromeId: Number(selectedSyndromeId) }
          : {}),
      }),
    [
      appliedRange,
      contextId,
      scoresPaginationModel,
      aboveThresholdFilter,
      statusFilter,
      selectedSyndromeId,
    ],
  );

  const { data: dailyData, isLoading: dailyLoading } = useDailySyndromeCounts(
    dailyQuery,
    { enabled: syndromicQueriesEnabled },
  );
  const { data: scoresData, isLoading: scoresLoading } = useReportSyndromeScores(
    scoreQuery,
    { enabled: syndromicQueriesEnabled && appliedRange !== null },
  );
  const mapPointsAboveThreshold = useMemo<ReportPoint[]>(() => {
    const rows = scoresData?.data ?? [];
    const byReport = new Map<number, ReportPoint>();
    for (const row of rows) {
      if (row.isAboveThreshold !== true) continue;
      const lat = row.occurrenceLocation?.latitude;
      const lng = row.occurrenceLocation?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (!byReport.has(row.reportId)) {
        // Scores sindrômicos são gerados para reports positivos.
        byReport.set(row.reportId, {
          latitude: Number(lat),
          longitude: Number(lng),
          reportType: "POSITIVE",
        });
      }
    }
    return Array.from(byReport.values());
  }, [scoresData?.data]);
  const reprocessMutation = useReprocessSyndromic();
  const monthlyChart = useMemo(() => {
    if (!dailyData || dailyData.labels.length === 0 || dailyData.series.length === 0) {
      return {
        monthLabels: [] as string[],
        rows: [] as Array<{
          monthLabel: string;
          valuesBySyndromeId: Record<number, number>;
        }>,
        legend: [] as Array<{ syndromeId: number; syndromeName: string; color: string }>,
      };
    }

    const monthByDay = dailyData.labels.map((label) => label.slice(0, 7));
    const uniqueMonths = Array.from(new Set(monthByDay));
    const monthLabelByKey = new Map(
      uniqueMonths.map((monthKey) => {
        const [year, month] = monthKey.split("-").map(Number);
        const date = new Date(year, month - 1, 1);
        const text = date.toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
        });
        return [monthKey, text];
      }),
    );

    const rows = uniqueMonths.map((monthKey) => ({
      monthLabel: monthLabelByKey.get(monthKey) ?? monthKey,
      valuesBySyndromeId: {} as Record<number, number>,
    }));
    const monthIndexByKey = new Map(uniqueMonths.map((monthKey, idx) => [monthKey, idx]));

    for (const seriesItem of dailyData.series) {
      for (let idx = 0; idx < dailyData.labels.length; idx += 1) {
        const monthKey = monthByDay[idx];
        const monthIndex = monthIndexByKey.get(monthKey);
        if (monthIndex === undefined) continue;
        const previous = rows[monthIndex].valuesBySyndromeId[seriesItem.syndromeId] ?? 0;
        rows[monthIndex].valuesBySyndromeId[seriesItem.syndromeId] =
          previous + Number(seriesItem.values[idx] ?? 0);
      }
    }

    const legend = dailyData.series.map((seriesItem, idx) => ({
      syndromeId: seriesItem.syndromeId,
      syndromeName: seriesItem.syndromeName,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));

    return {
      monthLabels: rows.map((row) => row.monthLabel),
      rows,
      legend,
    };
  }, [dailyData]);

  const chartDataset = useMemo(() => {
    if (!monthlyChart.rows.length) return [];
    return monthlyChart.rows.map((row) => {
      const entry: Record<string, string | number> = { month: row.monthLabel };
      for (const leg of monthlyChart.legend) {
        entry[`s${leg.syndromeId}`] = row.valuesBySyndromeId[leg.syndromeId] ?? 0;
      }
      return entry;
    });
  }, [monthlyChart.rows, monthlyChart.legend]);

  const barSeries = useMemo(
    () =>
      monthlyChart.legend.map((item) => ({
        dataKey: `s${item.syndromeId}`,
        label: item.syndromeName,
        color: item.color,
      })),
    [monthlyChart.legend],
  );

  const selectedSyndromeName = useMemo(() => {
    if (selectedSyndromeId === "") return null;
    const found = syndromeOptions.find((s) => String(s.id) === selectedSyndromeId);
    return found?.name ?? null;
  }, [selectedSyndromeId, syndromeOptions]);

  const maxMonthlyValue = useMemo(() => {
    let maxValue = 0;
    for (const row of monthlyChart.rows) {
      for (const value of Object.values(row.valuesBySyndromeId)) {
        if (value > maxValue) maxValue = value;
      }
    }
    return maxValue;
  }, [monthlyChart.rows]);

  const handleConsultar = () => {
    if (startDate > endDate) {
      snackbar.showError("A data inicial deve ser menor ou igual à data final");
      return;
    }
    setAppliedRange({ startDate, endDate });
  };

  const handleReprocess = () => {
    reprocessMutation.mutate(
      {
        startDate,
        endDate,
        onlyLatestActive: true,
        limit: 2000,
        ...(contextId != null ? { contextId } : {}),
      },
      {
        onSuccess: (result) => {
          snackbar.showSuccess(
            `Reprocessamento concluído. processed=${result.processedCount}, skipped=${result.skippedCount}, failed=${result.failedCount}`,
          );
          setReprocessDialogOpen(false);
        },
        onError: (error: unknown) => snackbar.showError(getErrorMessage(error)),
      },
    );
  };

  const handleConfirmSingleReprocess = () => {
    if (singleReprocessReportId == null) return;
    const reportId = singleReprocessReportId;
    reprocessMutation.mutate(
      {
        reportIds: [reportId],
        onlyLatestActive: true,
        limit: 20,
        ...(contextId != null ? { contextId } : {}),
      },
      {
        onSuccess: (result) => {
          snackbar.showSuccess(
            `Report ${reportId}: processed=${result.processedCount}, skipped=${result.skippedCount}, failed=${result.failedCount}`,
          );
          setSingleReprocessReportId(null);
        },
        onError: (error: unknown) => snackbar.showError(getErrorMessage(error)),
      },
    );
  };

  const columns: GridColDef[] = [
    { field: "reportId", headerName: "Report", width: 90 },
    {
      field: "syndromeName",
      headerName: "Síndrome",
      flex: 1,
      minWidth: 180,
      valueGetter: (_, row) => row.syndromeName ?? "-",
    },
    {
      field: "score",
      headerName: "Score",
      width: 120,
      valueGetter: (_, row) => formatSyndromicPercent(row.score),
    },
    {
      field: "thresholdScore",
      headerName: "Limiar",
      width: 120,
      valueGetter: (_, row) => formatSyndromicPercent(row.thresholdScore),
    },
    {
      field: "isAboveThreshold",
      headerName: "Acima limiar",
      width: 130,
      renderCell: (params) =>
        params.value === true ? (
          <Chip label="Sim" size="small" color="success" />
        ) : params.value === false ? (
          <Chip label="Não" size="small" color="warning" />
        ) : (
          <Chip label="N/A" size="small" />
        ),
    },
    {
      field: "processingStatus",
      headerName: "Status",
      width: 158,
      minWidth: 150,
      renderCell: (params) => {
        if (params.value === "processed") {
          return <Chip label="Processado" color="success" size="small" />;
        }
        if (params.value === "failed") {
          return <Chip label="Falhou" color="error" size="small" />;
        }
        return <Chip label="Ignorado (skipped)" color="default" size="small" />;
      },
    },
    {
      field: "processedAt",
      headerName: "Processado em",
      width: 160,
      minWidth: 150,
      valueGetter: (_, row) =>
        formatDateTimeFromApi(row.processedAt, currentLanguage),
    },
    {
      field: "actions",
      headerName: "Ações",
      width: canReprocess ? 112 : 52,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.25,
            width: "100%",
            height: "100%",
          }}
        >
          <Tooltip title="Ver detalhes do report e do registro de classificação">
            <IconButton
              size="small"
              aria-label="Visualizar detalhes"
              color="primary"
              onClick={() => setScoreDetailRow(params.row as ReportSyndromeScoreItem)}
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {canReprocess ? (
            <Tooltip
              title={
                isAdmin && contextId == null
                  ? "Selecione um contexto para reprocessar."
                  : "Reprocessar só este report no contexto atual (admin) — pede confirmação"
              }
            >
              <span>
                <IconButton
                  size="small"
                  aria-label="Solicitar reprocessamento deste report"
                  disabled={
                    reprocessMutation.isPending || (isAdmin && contextId == null)
                  }
                  onClick={() => setSingleReprocessReportId(params.row.reportId)}
                >
                  <ReplayIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        p: 3,
        display: "grid",
        gap: 2,
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h4" component="h1">
          Classificação Sindrômica - Relatórios
        </Typography>
        <Tooltip title="Ajuda sobre esta página">
          <IconButton
            aria-label="Ajuda sobre esta página"
            size="small"
            color="primary"
            onClick={() => setHelpDialogOpen(true)}
          >
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {!roleLoading && isAdmin && contextId == null && (
        <Alert severity="warning">
          Selecione um contexto no cabeçalho da aplicação para carregar os
          relatórios sindrômicos (o perfil administrador exige contexto explícito
          na API).
        </Alert>
      )}

      {/**
       * Bloco único de filtros — tudo que afeta gráfico, tabela e mapa fica aqui.
       * Evita filtros duplicados/espalhados e dá uma leitura de cima-para-baixo.
       */}
      <Paper sx={{ p: 2, display: "grid", gap: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Typography variant="subtitle1">Filtros</Typography>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
            },
          }}
        >
          <TextField
            size="small"
            label="Data inicial"
            type="date"
            value={startDate}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            fullWidth
            sx={{ minWidth: 0 }}
          />
          <TextField
            size="small"
            label="Data final"
            type="date"
            value={endDate}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            fullWidth
            sx={{ minWidth: 0 }}
          />
          <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
            <InputLabel id="syndromic-global-syndrome-label">Síndrome</InputLabel>
            <Select
              labelId="syndromic-global-syndrome-label"
              label="Síndrome"
              value={selectedSyndromeId}
              onChange={(e) => setSelectedSyndromeId(String(e.target.value))}
            >
              <MenuItem value="">Todas</MenuItem>
              {syndromesLoading && <MenuItem disabled>Carregando...</MenuItem>}
              {syndromeOptions.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
            <InputLabel id="syndromic-global-above-label">Acima do limiar</InputLabel>
            <Select
              labelId="syndromic-global-above-label"
              label="Acima do limiar"
              value={aboveThresholdFilter}
              onChange={(e) =>
                setAboveThresholdFilter(e.target.value as "" | "true" | "false")
              }
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="true">Sim (vigilância)</MenuItem>
              <MenuItem value="false">Não</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
            <InputLabel id="syndromic-global-status-label">Status</InputLabel>
            <Select
              labelId="syndromic-global-status-label"
              label="Status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "" | "processed" | "skipped" | "failed",
                )
              }
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="processed">Processado</MenuItem>
              <MenuItem value="skipped">Ignorado (skipped)</MenuItem>
              <MenuItem value="failed">Falhou</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider flexItem />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Button
              variant="contained"
              onClick={handleConsultar}
              disabled={dailyLoading || scoresLoading}
            >
              Consultar
            </Button>
            <Tooltip
              title={
                !canReprocess
                  ? "Somente administrador pode reprocessar."
                  : isAdmin && contextId == null
                    ? "Selecione um contexto no seletor do sistema para reprocessar só esse contexto."
                    : "Reprocessa reports no intervalo de datas (apenas o contexto atual). Não exige Consultar antes."
              }
            >
              <span>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => setReprocessDialogOpen(true)}
                  disabled={
                    reprocessMutation.isPending ||
                    !canReprocess ||
                    (isAdmin && contextId == null)
                  }
                >
                  Recalcular período
                </Button>
              </span>
            </Tooltip>
          </Box>
          <Typography variant="caption" color="text.secondary">
            <strong>Consultar</strong> aplica os filtros ao gráfico, tabela e mapa.{" "}
            <strong>Recalcular</strong> usa as datas no{" "}
            <strong>contexto atual</strong> para rodar o motor de novo (admin).
          </Typography>
        </Stack>

        {appliedRange && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary">
              Consulta aplicada:
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              label={`${appliedRange.startDate} → ${appliedRange.endDate}`}
            />
            <Chip
              size="small"
              variant="outlined"
              color={selectedSyndromeName ? "primary" : "default"}
              label={`Síndrome: ${selectedSyndromeName ?? "todas"}`}
            />
            <Chip
              size="small"
              variant="outlined"
              color={
                aboveThresholdFilter === "true"
                  ? "success"
                  : aboveThresholdFilter === "false"
                    ? "warning"
                    : "default"
              }
              label={`Acima do limiar: ${
                aboveThresholdFilter === "true"
                  ? "sim"
                  : aboveThresholdFilter === "false"
                    ? "não"
                    : "todos"
              }`}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`Status: ${statusFilter === "" ? "todos" : statusFilter}`}
            />
          </Box>
        )}
      </Paper>

      {/* Painel 1: gráfico — um único gráfico, sem filtros locais. */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
          Totais por síndrome no período
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          {chartOnlyAboveThreshold
            ? "Conta apenas registros com score ≥ limiar (filtro acima do limiar = sim). Útil para vigilância."
            : "Conta todas as linhas por síndrome. Para focar em sinais fortes, use o filtro \"Acima do limiar = Sim\"."}
        </Typography>
        {!appliedRange && (
          <Typography color="text.secondary">
            Defina os filtros acima e clique em <strong>Consultar</strong>.
          </Typography>
        )}
        {appliedRange && dailyLoading && <Typography>Carregando...</Typography>}
        {!dailyLoading &&
          appliedRange &&
          (!dailyData || dailyData.totalsBySyndrome.length === 0) && (
            <Typography color="text.secondary">Sem dados no período.</Typography>
          )}
        {!dailyLoading && monthlyChart.rows.length > 0 && chartDataset.length > 0 && (
          <Box sx={{ width: "100%", minHeight: 400, mt: 1 }}>
            <BarChart
              dataset={chartDataset}
              xAxis={[
                {
                  scaleType: "band",
                  dataKey: "month",
                  tickLabelStyle: { fontSize: 11 },
                },
              ]}
              yAxis={[{ tickMinStep: 1 }]}
              series={barSeries}
              grid={{ horizontal: true }}
              height={380}
              margin={{ left: 48, right: 16, top: 8, bottom: 48 }}
              sx={{ width: "100%" }}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Eixo Y: total mensal por síndrome (barras agrupadas por mês). Maior valor no
              período: {maxMonthlyValue}.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Painel 2: tabela + mapa — toolbar enxuta, sem filtros duplicados. */}
      <Paper sx={{ p: 2, minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1.5 }}
        >
          <Box>
            <Typography variant="subtitle1">Registros de classificação</Typography>
            <Typography variant="caption" color="text.secondary">
              {appliedRange
                ? `${scoresData?.meta.totalItems ?? 0} registro(s) encontrados`
                : "Clique em Consultar para carregar os registros."}
            </Typography>
          </Box>
          <Tooltip
            title={
              aboveThresholdFilter !== "true"
                ? "O mapa mostra apenas registros com acima do limiar = Sim. Ajuste o filtro acima para habilitar."
                : "Plota no mapa os registros acima do limiar da página atual com occurrence_location"
            }
          >
            <span>
              <Button
                variant="outlined"
                startIcon={<MapIcon />}
                onClick={() => setShowAboveThresholdMap((prev) => !prev)}
                disabled={appliedRange === null}
              >
                {showAboveThresholdMap ? "Ocultar mapa" : "Visualização no mapa"}
              </Button>
            </span>
          </Tooltip>
        </Stack>
        {showAboveThresholdMap && (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Mapa — registros acima do limiar (página atual)
            </Typography>
            {aboveThresholdFilter !== "true" ? (
              <Alert severity="info">
                O mapa exibe apenas registros acima do limiar. Selecione{" "}
                <strong>Acima do limiar = Sim</strong> nos filtros para visualizar.
              </Alert>
            ) : scoresLoading ? (
              <Typography color="text.secondary">Carregando pontos...</Typography>
            ) : mapPointsAboveThreshold.length > 0 ? (
              <ReportsMapView
                points={mapPointsAboveThreshold}
                height={360}
                showSummary={false}
              />
            ) : (
              <Alert severity="info">
                Nenhum registro acima do limiar com `occurrence_location` na página atual.
              </Alert>
            )}
          </Paper>
        )}
        <Box sx={{ width: "100%", minWidth: 0 }}>
          <DataGrid
            localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
            rows={scoresData?.data ?? []}
            columns={columns}
            loading={scoresLoading}
            autoHeight
            disableRowSelectionOnClick
            disableColumnResize
            paginationMode="server"
            rowCount={scoresData?.meta.totalItems ?? 0}
            paginationModel={scoresPaginationModel}
            onPaginationModelChange={setScoresPaginationModel}
            pageSizeOptions={[25, 50, 100]}
            sx={{ width: "100%", minWidth: 0 }}
          />
        </Box>
      </Paper>

      <Dialog
        open={scoreDetailRow !== null}
        onClose={() => setScoreDetailRow(null)}
        maxWidth="lg"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>Detalhes do report e da classificação</DialogTitle>
        <DialogContent dividers>
          {scoreDetailRow && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Registro de classificação
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(260px, 340px)" },
                    alignItems: "start",
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gap: 1.5,
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                      },
                    }}
                  >
                    <ClassificationDetailField label="ID do registro">
                      <Typography variant="body2">{scoreDetailRow.id}</Typography>
                    </ClassificationDetailField>
                    <ClassificationDetailField label="Report">
                      <Typography variant="body2">{scoreDetailRow.reportId}</Typography>
                    </ClassificationDetailField>
                    <ClassificationDetailField label="Síndrome (ID)">
                      <Typography variant="body2">{scoreDetailRow.syndromeId ?? "—"}</Typography>
                    </ClassificationDetailField>
                    <ClassificationDetailField label="Código">
                      <Typography variant="body2">{scoreDetailRow.syndromeCode ?? "—"}</Typography>
                    </ClassificationDetailField>
                    <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                      <ClassificationDetailField label="Nome">
                        <Typography variant="body2">{scoreDetailRow.syndromeName ?? "—"}</Typography>
                      </ClassificationDetailField>
                    </Box>
                    <ClassificationDetailField label="Score">
                      <Typography variant="body2">
                        {formatSyndromicPercent(scoreDetailRow.score)}
                      </Typography>
                    </ClassificationDetailField>
                    <ClassificationDetailField label="Limiar">
                      <Typography variant="body2">
                        {formatSyndromicPercent(scoreDetailRow.thresholdScore)}
                      </Typography>
                    </ClassificationDetailField>
                    <ClassificationDetailField label="Acima do limiar">
                      {scoreDetailRow.isAboveThreshold === true ? (
                        <Chip label="Sim" size="small" color="success" />
                      ) : scoreDetailRow.isAboveThreshold === false ? (
                        <Chip label="Não" size="small" color="warning" />
                      ) : (
                        <Chip label="N/A" size="small" />
                      )}
                    </ClassificationDetailField>
                    <ClassificationDetailField label="Status de processamento">
                      {scoreDetailRow.processingStatus === "processed" ? (
                        <Chip label="Processado" color="success" size="small" />
                      ) : scoreDetailRow.processingStatus === "failed" ? (
                        <Chip label="Falhou" color="error" size="small" />
                      ) : (
                        <Chip label="Ignorado (skipped)" color="default" size="small" />
                      )}
                    </ClassificationDetailField>
                    <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                      <ClassificationDetailField label="Erro">
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {scoreDetailRow.processingError?.trim()
                            ? scoreDetailRow.processingError
                            : "—"}
                        </Typography>
                      </ClassificationDetailField>
                    </Box>
                    <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                      <ClassificationDetailField label="Processado em">
                        <Typography variant="body2">
                          {formatDateTimeFromApi(scoreDetailRow.processedAt, currentLanguage)}
                        </Typography>
                      </ClassificationDetailField>
                    </Box>
                  </Box>

                  <Box sx={{ width: "100%", minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mb: 0.75 }}
                    >
                      Local da ocorrência
                    </Typography>
                    {scoreDetailMapPoints.length > 0 ? (
                      <ReportsMapView
                        points={scoreDetailMapPoints}
                        height={240}
                        showSummary={false}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Sem coordenadas para este registro.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Resposta do formulário
                </Typography>
                {reportDetailQuery.isPending && (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <CircularProgress size={28} />
                  </Box>
                )}
                {reportDetailQuery.isError && (
                  <Alert severity="error">
                    Não foi possível carregar o report. Verifique permissões ou tente
                    novamente.
                  </Alert>
                )}
                {reportDetailQuery.data && (
                  <Stack spacing={1.5}>
                    <Typography variant="caption" color="text.secondary">
                      Metadados: participação {reportDetailQuery.data.participationId} · versão
                      do formulário {reportDetailQuery.data.formVersionId} · tipo{" "}
                      {reportDetailQuery.data.reportType} · ativo{" "}
                      {reportDetailQuery.data.active ? "sim" : "não"}
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        overflow: "auto",
                        maxHeight: 420,
                        bgcolor: "grey.50",
                      }}
                    >
                      <FormResponseBody formResponse={reportDetailQuery.data.formResponse} />
                    </Paper>
                  </Stack>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScoreDetailRow(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)}>
        <DialogTitle>Ajuda — Classificação sindrômica (relatórios)</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Use <strong>data inicial</strong> e <strong>data final</strong> para
              delimitar o período. <strong>Consultar</strong> carrega os totais por
              síndrome e a tabela de registros classificados para esse intervalo.
            </Typography>
            <Typography>
              Administradores podem usar <strong>Recalcular período</strong> para
              executar o motor de classificação de novo nos reports do período no{" "}
              <strong>contexto selecionado</strong> (é preciso escolher o contexto no
              cabeçalho), o ícone de olho para ver a resposta do formulário e os detalhes
              do registro, ou o de replay para reprocessar só aquele report (com
              confirmação) no mesmo contexto.
            </Typography>
            <Typography>
              Os filtros no topo (datas, síndrome, acima do limiar, status) valem
              para <strong>gráfico, tabela e mapa</strong>. Para vigilância, deixe{" "}
              <strong>Acima do limiar = Sim</strong> — os totais passam a contar
              apenas sinais fortes por síndrome e o mapa é habilitado.
            </Typography>
            <Typography>
              Só são classificados reports de formulários com configuração ativa.
              Para incluir um formulário no cálculo, cadastre uma configuração em{" "}
              <RouterLink to="/admin/syndromic/form-configs">
                Classificação Sindrômica → Formulários (extração)
              </RouterLink>{" "}
              para esse formulário (vale para todas as versões), depois use
              &quot;Recalcular&quot; ou o ícone de replay na linha (com confirmação).
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={singleReprocessReportId !== null}
        onClose={() => {
          if (!reprocessMutation.isPending) setSingleReprocessReportId(null);
        }}
      >
        <DialogTitle>Confirmar reprocessamento</DialogTitle>
        <DialogContent>
          <Typography>
            Deseja executar o motor de classificação sindrômica de novo para o{" "}
            <strong>report {singleReprocessReportId}</strong> no contexto atual? Isso
            pode alterar scores e registros associados a esse report.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSingleReprocessReportId(null)}
            disabled={reprocessMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmSingleReprocess}
            disabled={reprocessMutation.isPending}
          >
            Reprocessar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reprocessDialogOpen} onClose={() => setReprocessDialogOpen(false)}>
        <DialogTitle>Reprocessar classificação</DialogTitle>
        <DialogContent>
          <Typography>
            Deseja reprocessar os reports do período selecionado?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReprocessDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleReprocess}
            disabled={reprocessMutation.isPending}
          >
            Reprocessar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
