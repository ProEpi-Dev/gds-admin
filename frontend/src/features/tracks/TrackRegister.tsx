import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Typography,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
} from "@mui/material";
import {
  FileDownload as FileDownloadIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import DataTable, { type Column } from "../../components/common/DataTable";
import FilterChips from "../../components/common/FilterChips";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorAlert from "../../components/common/ErrorAlert";
import SelectParticipationSearch from "../../components/common/SelectParticipationSearch";
import { useDebounce } from "../../hooks/useDebounce";
import { useCurrentContext } from "../../contexts/CurrentContextContext";
import { useTrackExecutions } from "../track-progress/hooks/useTrackProgress";
import { TrackProgressService } from "../../api/services/track-progress.service";
import { useTrackCycles } from "../track-cycles/hooks/useTrackCycles";
import { useParticipation } from "../participations/hooks/useParticipations";
import type {
  TrackExecutionRow,
  TrackExecutionsQueryParams,
} from "../../types/track-progress.types";
import type { TrackCycle } from "../../types/track-cycle.types";
import type { Participation } from "../../types/participation.types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_PAGE_SIZE = 20;
/** Lote máximo aceito pelo backend em cada página. */
const EXPORT_BATCH_SIZE = 100;
/** Acima disso o CSV pede filtros mais específicos em vez de baixar tudo. */
const EXPORT_MAX_ROWS = 5000;

function formatCompletedAt(completedAt: string | null) {
  return completedAt
    ? format(new Date(completedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : "-";
}

/** Busca todas as páginas do filtro atual, em lotes, para o CSV. */
async function fetchAllExecutions(
  params: TrackExecutionsQueryParams,
  totalItems: number,
): Promise<TrackExecutionRow[]> {
  const rows: TrackExecutionRow[] = [];
  const totalPages = Math.ceil(totalItems / EXPORT_BATCH_SIZE);
  for (let page = 1; page <= totalPages; page++) {
    const response = await TrackProgressService.getExecutions({
      ...params,
      page,
      pageSize: EXPORT_BATCH_SIZE,
    });
    rows.push(...response.data.data);
  }
  return rows;
}

function downloadExecutionsCsv(rows: TrackExecutionRow[]) {
  const headers = [
    "Ciclo de Trilha",
    "Atividade",
    "Tipo da Sequência",
    "Participante",
    "Data de Conclusão",
  ];
  const lines = rows.map((row) => [
    row.trackCycleName,
    row.activityName,
    row.sequenceType === "quiz" ? "Quiz" : "Conteúdo",
    row.participantName,
    formatCompletedAt(row.completedAt),
  ]);
  const escape = (cell: string) => `"${String(cell).replace(/"/g, '""')}"`;
  const csvContent = [
    headers.map(escape).join(";"),
    ...lines.map((line) => line.map(escape).join(";")),
  ].join("\n");
  const blob = new Blob(["﻿" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `execucoes_trilhas_${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function TrackExecutionRegistry() {
  const { currentContext } = useCurrentContext();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [trackCycleId, setTrackCycleId] = useState<number | undefined>(
    undefined,
  );
  const [participationId, setParticipationId] = useState<number | undefined>(
    undefined,
  );
  const [selectedParticipation, setSelectedParticipation] =
    useState<Participation | null>(null);
  const [sequenceType, setSequenceType] = useState<
    "content" | "quiz" | undefined
  >(undefined);
  const [activityNameInput, setActivityNameInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const activityName = useDebounce(activityNameInput, 400);
  const contextId = currentContext?.id;

  const filterParams: TrackExecutionsQueryParams = useMemo(() => {
    const params: TrackExecutionsQueryParams = { contextId };
    if (trackCycleId != null) params.trackCycleId = trackCycleId;
    if (participationId != null) params.participationId = participationId;
    if (sequenceType) params.sequenceType = sequenceType;
    if (activityName.trim()) params.activityName = activityName.trim();
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return params;
  }, [
    contextId,
    trackCycleId,
    participationId,
    sequenceType,
    activityName,
    dateFrom,
    dateTo,
  ]);

  // Filtro novo começa da primeira página.
  useEffect(() => {
    setPage(1);
    setExportMessage(null);
  }, [filterParams]);

  const queryParams = useMemo(
    () => ({ ...filterParams, page, pageSize }),
    [filterParams, page, pageSize],
  );

  const { data, isLoading, error } = useTrackExecutions(queryParams);
  const executions = useMemo(() => data?.data ?? [], [data]);
  const totalItems = data?.meta.totalItems ?? 0;
  const { data: cycles = [] } = useTrackCycles({
    contextId: currentContext?.id,
    active: true,
  });
  const { data: participationDetail } = useParticipation(
    participationId ?? null,
  );

  const handleExportCSV = async () => {
    if (totalItems > EXPORT_MAX_ROWS) {
      setExportMessage(
        `O filtro atual tem ${totalItems.toLocaleString("pt-BR")} execuções. ` +
          `Refine os filtros (ciclo, participante ou datas) para exportar até ` +
          `${EXPORT_MAX_ROWS.toLocaleString("pt-BR")}.`,
      );
      return;
    }
    setExportMessage(null);
    setExporting(true);
    try {
      downloadExecutionsCsv(await fetchAllExecutions(filterParams, totalItems));
    } catch {
      setExportMessage("Não foi possível exportar as execuções. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setTrackCycleId(undefined);
    setParticipationId(undefined);
    setSelectedParticipation(null);
    setSequenceType(undefined);
    setActivityNameInput("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const activeFilters = [
    ...(trackCycleId != null && cycles.find((c) => c.id === trackCycleId)
      ? [
          {
            label: "Ciclo de Trilha",
            value: cycles.find((c) => c.id === trackCycleId)?.name,
            onDelete: () => setTrackCycleId(undefined),
          },
        ]
      : []),
    ...(participationId != null
      ? [
          {
            label: "Participante",
            value:
              participationDetail?.userName ??
              selectedParticipation?.userName ??
              `#${participationId}`,
            onDelete: () => {
              setParticipationId(undefined);
              setSelectedParticipation(null);
            },
          },
        ]
      : []),
    ...(sequenceType
      ? [
          {
            label: "Tipo",
            value: sequenceType === "quiz" ? "Quiz" : "Conteúdo",
            onDelete: () => setSequenceType(undefined),
          },
        ]
      : []),
    ...(activityName.trim()
      ? [
          {
            label: "Atividade",
            value: activityName.trim(),
            onDelete: () => setActivityNameInput(""),
          },
        ]
      : []),
    ...(dateFrom
      ? [
          {
            label: "Data de",
            value: dateFrom,
            onDelete: () => setDateFrom(""),
          },
        ]
      : []),
    ...(dateTo
      ? [
          {
            label: "Data até",
            value: dateTo,
            onDelete: () => setDateTo(""),
          },
        ]
      : []),
  ];

  const columns: Column<TrackExecutionRow>[] = [
    {
      id: "trackCycleName",
      label: "Ciclo de Trilha",
      minWidth: 180,
      mobileLabel: "Ciclo",
      render: (row) => row.trackCycleName,
    },
    {
      id: "activityName",
      label: "Atividade",
      minWidth: 200,
      mobileLabel: "Atividade",
      render: (row) => row.activityName,
    },
    {
      id: "sequenceType",
      label: "Tipo da Sequência",
      minWidth: 120,
      mobileLabel: "Tipo",
      render: (row) => (row.sequenceType === "quiz" ? "Quiz" : "Conteúdo"),
    },
    {
      id: "participantName",
      label: "Participante",
      minWidth: 180,
      mobileLabel: "Participante",
      render: (row) => row.participantName,
    },
    {
      id: "completedAt",
      label: "Data de Conclusão",
      minWidth: 160,
      mobileLabel: "Conclusão",
      render: (row) => formatCompletedAt(row.completedAt),
    },
    {
      id: "actions",
      label: "Ações",
      minWidth: 100,
      mobileLabel: "Ações",
      render: (row) => (
        <Button
          component={Link}
          to={`/admin/track-cycles/${row.trackCycleId}/participation/${row.participationId}/trilha`}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          startIcon={<OpenInNewIcon fontSize="small" />}
          variant="outlined"
        >
          Ver trilha
        </Button>
      ),
    },
  ];

  if (error)
    return (
      <ErrorAlert
        message={
          error instanceof Error ? error.message : "Erro ao carregar execuções"
        }
      />
    );

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          Registro de Execução das Trilhas
        </Typography>
        <Button
          variant="outlined"
          color="success"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportCSV}
          disabled={totalItems === 0 || exporting}
        >
          {exporting ? "Exportando..." : "Exportar CSV"}
        </Button>
      </Stack>

      {exportMessage && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          onClose={() => setExportMessage(null)}
        >
          {exportMessage}
        </Alert>
      )}

      {/* Filtros */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        mb={2}
        flexWrap="wrap"
        useFlexGap
      >
        <Autocomplete
          sx={{ minWidth: 260 }}
          options={cycles}
          getOptionLabel={(opt: TrackCycle) => opt.name ?? ""}
          value={cycles.find((c) => c.id === trackCycleId) ?? null}
          onChange={(_, v) => setTrackCycleId(v?.id)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Ciclo de Trilha"
              size="small"
              placeholder="Todos"
            />
          )}
        />
        <TextField
          size="small"
          label="Atividade (nome)"
          value={activityNameInput}
          onChange={(e) => setActivityNameInput(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Tipo da Sequência</InputLabel>
          <Select
            value={sequenceType ?? "all"}
            label="Tipo da Sequência"
            onChange={(e) => {
              const v = e.target.value;
              setSequenceType(
                v === "all" ? undefined : (v as "content" | "quiz"),
              );
            }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="content">Conteúdo</MenuItem>
            <MenuItem value="quiz">Quiz</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ minWidth: 260 }}>
          <SelectParticipationSearch
            value={selectedParticipation}
            onChange={(p) => {
              setSelectedParticipation(p);
              setParticipationId(p?.id);
            }}
            valueId={participationId ?? undefined}
            label="Participante"
            placeholder="Digite para buscar no servidor..."
            size="small"
          />
        </Box>
        <TextField
          size="small"
          label="Data de conclusão de"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          size="small"
          label="Data de conclusão até"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
      </Stack>

      {activeFilters.length > 0 && (
        <FilterChips filters={activeFilters} onClearAll={clearFilters} />
      )}

      {isLoading ? (
        <Box sx={{ mt: 4 }}>
          <LoadingSpinner />
        </Box>
      ) : (
        <DataTable
          columns={columns}
          data={executions}
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          variant="table"
          emptyMessage="Nenhuma execução encontrada. Ajuste os filtros ou aguarde conclusões de atividades."
        />
      )}
    </Box>
  );
}
