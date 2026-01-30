import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import DataTable, { type Column } from "../../../components/common/DataTable";
import FilterChips from "../../../components/common/FilterChips";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorAlert from "../../../components/common/ErrorAlert";
import { useTrackCycles, useDeleteTrackCycle } from "../hooks/useTrackCycles";
import {
  TrackCycleStatus,
  type TrackCycle,
} from "../../../types/track-cycle.types";

const STATUS_LABELS: Record<TrackCycleStatus, string> = {
  [TrackCycleStatus.DRAFT]: "Rascunho",
  [TrackCycleStatus.ACTIVE]: "Ativo",
  [TrackCycleStatus.CLOSED]: "Encerrado",
  [TrackCycleStatus.ARCHIVED]: "Arquivado",
};

const STATUS_COLORS: Record<
  TrackCycleStatus,
  "default" | "primary" | "success" | "warning" | "error"
> = {
  [TrackCycleStatus.DRAFT]: "default",
  [TrackCycleStatus.ACTIVE]: "success",
  [TrackCycleStatus.CLOSED]: "warning",
  [TrackCycleStatus.ARCHIVED]: "default",
};

const DEFAULT_PAGE_SIZE = 10;

export default function TrackCyclesListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<
    TrackCycleStatus | undefined
  >(undefined);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [cycleToDelete, setCycleToDelete] = useState<TrackCycle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const {
    data: cycles,
    isLoading,
    error,
  } = useTrackCycles({
    status: statusFilter,
    active: activeFilter,
  });

  const deleteMutation = useDeleteTrackCycle();

  const handleDelete = (cycle: TrackCycle) => {
    setCycleToDelete(cycle);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (cycleToDelete) {
      deleteMutation.mutate(cycleToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setCycleToDelete(null);
        },
      });
    }
  };

  const columns: Column<TrackCycle>[] = [
    {
      id: "id",
      label: "ID",
      minWidth: 70,
      mobileLabel: "ID",
    },
    {
      id: "name",
      label: "Ciclo",
      minWidth: 120,
      mobileLabel: "Ciclo",
    },
    {
      id: "track",
      label: "Trilha",
      minWidth: 160,
      mobileLabel: "Trilha",
      render: (row) => row.track?.name || "-",
    },
    {
      id: "context",
      label: "Contexto",
      minWidth: 140,
      mobileLabel: "Contexto",
      render: (row) => row.context?.name || "-",
    },
    {
      id: "status",
      label: "Status",
      minWidth: 120,
      mobileLabel: "Status",
      render: (row) => (
        <Chip
          label={STATUS_LABELS[row.status]}
          color={STATUS_COLORS[row.status]}
          size="small"
        />
      ),
    },
    {
      id: "start_date",
      label: "Início",
      minWidth: 100,
      mobileLabel: "Início",
      render: (row) => new Date(row.start_date).toLocaleDateString("pt-BR"),
    },
    {
      id: "end_date",
      label: "Término",
      minWidth: 100,
      mobileLabel: "Término",
      render: (row) => new Date(row.end_date).toLocaleDateString("pt-BR"),
    },
    {
      id: "actions",
      label: "Ações",
      minWidth: 180,
      mobileLabel: "Ações",
      render: (row) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            onClick={() => navigate(`/admin/track-cycles/${row.id}/edit`)}
            title="Editar"
            color="primary"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/admin/track-cycles/${row.id}/students`)}
            title="Ver participantes"
            color="success"
          >
            <PeopleIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(row)}
            color="error"
            title="Deletar"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const activeFilters = [
    ...(statusFilter && STATUS_LABELS[statusFilter]
      ? [
          {
            label: "Status",
            value: STATUS_LABELS[statusFilter],
            onDelete: () => setStatusFilter(undefined),
          },
        ]
      : []),
    ...(activeFilter !== undefined
      ? [
          {
            label: "Ativos",
            value: activeFilter ? "Sim" : "Não",
            onDelete: () => setActiveFilter(undefined),
          },
        ]
      : []),
  ];

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao carregar dados";

    return <ErrorAlert message={message} />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          Ciclos de Trilhas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/admin/track-cycles/create")}
        >
          Novo Ciclo
        </Button>
      </Stack>

      {/* Filtros */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={2}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter ?? "all"}
            label="Status"
            onChange={(e) => {
              const value = e.target.value;
              setStatusFilter(
                value === "all" ? undefined : (value as TrackCycleStatus),
              );
            }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value={TrackCycleStatus.DRAFT}>Rascunho</MenuItem>
            <MenuItem value={TrackCycleStatus.ACTIVE}>Ativo</MenuItem>
            <MenuItem value={TrackCycleStatus.CLOSED}>Encerrado</MenuItem>
            <MenuItem value={TrackCycleStatus.ARCHIVED}>Arquivado</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Ativos</InputLabel>
          <Select
            value={
              activeFilter === undefined
                ? "all"
                : activeFilter
                  ? "true"
                  : "false"
            }
            label="Ativos"
            onChange={(e) => {
              const value = e.target.value;
              setActiveFilter(value === "all" ? undefined : value === "true");
            }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="true">Sim</MenuItem>
            <MenuItem value="false">Não</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Chips de filtros ativos */}
      {activeFilters.length > 0 && <FilterChips filters={activeFilters} />}

      {/* Tabela */}
      <DataTable
        columns={columns}
        data={(cycles || []).slice((page - 1) * pageSize, page * pageSize)}
        page={page}
        pageSize={pageSize}
        totalItems={(cycles || []).length}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />

      {/* Dialog de confirmação de deleção */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Confirmar exclusão permanente"
        message={`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o ciclo ${cycleToDelete?.name}?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setCycleToDelete(null);
        }}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
