import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Alert,
  Menu,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Map as MapIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useReports, useDeleteReport } from '../hooks/useReports';
import { useForms } from '../../forms/hooks/useForms';
import { useFormVersions } from '../../forms/hooks/useFormVersions';
import { useCurrentContext } from '../../../contexts/CurrentContextContext';
import type { FormBuilderDefinition, FormField } from '../../../types/form-builder.types';
import DataTable, { type Column } from '../../../components/common/DataTable';
import FilterChips from '../../../components/common/FilterChips';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTranslation } from '../../../hooks/useTranslation';
import type { Report } from '../../../types/report.types';

/** Filtros da listagem (sem persistência em storage). */
interface ReportListFilters {
  activeFilter: boolean | undefined;
  reportTypeFilter: string | undefined;
  formIdFilter: number | undefined;
  startDate: string;
  endDate: string;
}

const LEGACY_REPORTS_FILTERS_KEY = 'reports-filters';

/** Rascunho: valores padrão sugeridos antes de clicar em Buscar. */
const defaultDraftFilters = (): ReportListFilters => ({
  activeFilter: true,
  reportTypeFilter: 'POSITIVE',
  formIdFilter: undefined,
  startDate: '',
  endDate: '',
});

/** Aplicado: só muda após Buscar (ou chips/limpar); inicia vazio para não disparar busca automática. */
const emptyAppliedFilters = (): ReportListFilters => ({
  activeFilter: undefined,
  reportTypeFilter: undefined,
  formIdFilter: undefined,
  startDate: '',
  endDate: '',
});

export default function ReportsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentContext } = useCurrentContext();

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_REPORTS_FILTERS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [draftFilters, setDraftFilters] = useState<ReportListFilters>(defaultDraftFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportListFilters>(emptyAppliedFilters);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const draftDateRangeInvalid =
    !!draftFilters.startDate &&
    !!draftFilters.endDate &&
    new Date(draftFilters.startDate) > new Date(draftFilters.endDate);

  const applyFiltersFromDraft = () => {
    if (!draftFilters.formIdFilter || draftDateRangeInvalid) {
      return;
    }
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  };

  // Buscar formulários para o filtro (do contexto atual; sem filtro de tipo para incluir signal e quiz).
  const { data: formsData, isLoading: formsLoading } = useForms(
    {
      page: 1,
      pageSize: 100,
      active: true,
      contextId: currentContext?.id,
    },
    { enabled: currentContext?.id != null },
  );

  // Buscar versões do formulário selecionado para obter a definição
  const { data: versionsData } = useFormVersions(appliedFilters.formIdFilter || null, {
    page: 1,
    pageSize: 50,
    active: true,
  });

  // Obter a definição do formulário (última versão ativa)
  const formDefinition: FormBuilderDefinition | null = useMemo(() => {
    if (!versionsData?.data || versionsData.data.length === 0) {
      return null;
    }
    // Ordenar por versionNumber descendente e pegar a primeira (mais recente)
    const sortedVersions = [...versionsData.data].sort(
      (a, b) => b.versionNumber - a.versionNumber,
    );
    return sortedVersions[0]?.definition || null;
  }, [versionsData]);

  const reportsEnabled =
    currentContext?.id != null && appliedFilters.formIdFilter != null;

  const { data, isLoading, error, isFetching } = useReports(
    {
      page,
      pageSize,
      active: appliedFilters.activeFilter,
      reportType: appliedFilters.reportTypeFilter as 'POSITIVE' | 'NEGATIVE' | undefined,
      formId: appliedFilters.formIdFilter,
      startDate: appliedFilters.startDate || undefined,
      endDate: appliedFilters.endDate || undefined,
      contextId: currentContext?.id,
    },
    { enabled: reportsEnabled },
  );

  const deleteMutation = useDeleteReport();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, report: Report) => {
    setAnchorEl(event.currentTarget);
    setSelectedReport(report);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReport(null);
  };

  const handleView = () => {
    if (selectedReport) {
      navigate(`/reports/${selectedReport.id}`);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedReport) {
      navigate(`/reports/${selectedReport.id}/edit`);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedReport) {
      setReportToDelete(selectedReport);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      deleteMutation.mutate(reportToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setReportToDelete(null);
        },
      });
    }
  };

  // Função para formatar valor do formResponse
  const formatFormResponseValue = (value: any, field: FormField): string => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (field.type === 'boolean') {
      return value ? 'Sim' : 'Não';
    }
    if (field.type === 'multiselect' && Array.isArray(value)) {
      return value.map((v) => {
        const option = field.options?.find((opt) => opt.value === v);
        return option ? option.label : String(v);
      }).join(', ');
    }
    if (field.type === 'select') {
      const option = field.options?.find((opt) => opt.value === value);
      return option ? option.label : String(value);
    }
    if (field.type === 'date' && value) {
      return new Date(value).toLocaleDateString('pt-BR');
    }
    if (
      field.type === 'mapPoint' &&
      value &&
      typeof value === 'object' &&
      typeof (value as any).latitude === 'number' &&
      typeof (value as any).longitude === 'number'
    ) {
      return `${Number((value as any).latitude).toFixed(6)}, ${Number(
        (value as any).longitude,
      ).toFixed(6)}`;
    }
    if (field.type === 'location' && value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, val]) => val !== null && val !== undefined && val !== '')
        .map(([key, val]) => `${key}: ${String(val)}`);
      return entries.length > 0 ? entries.join(' | ') : '-';
    }
    return String(value);
  };

  // Criar colunas dinâmicas baseadas na definição do formulário
  const getFormResponseColumns = (): Column<Report>[] => {
    if (!formDefinition?.fields || formDefinition.fields.length === 0) {
      return [];
    }

    return formDefinition.fields.map((field) => ({
      id: `formResponse.${field.name}`,
      label: field.label || field.name,
      minWidth: 150,
      mobileLabel: field.label || field.name,
      render: (row) => {
        const formResponse = row.formResponse || {};
        const value = formResponse[field.name];
        return formatFormResponseValue(value, field);
      },
    }));
  };

  // Colunas base
  const baseColumns: Column<Report>[] = [
    {
      id: 'id',
      label: 'ID',
      minWidth: 80,
      mobileLabel: 'ID',
      render: (row) => row.id.toString(),
    },
    {
      id: 'participationId',
      label: t('reports.participation'),
      minWidth: 100,
      mobileLabel: t('reports.participation'),
      render: (row) => `#${row.participationId}`,
    },
    {
      id: 'formVersionId',
      label: t('reports.formVersion'),
      minWidth: 100,
      mobileLabel: t('reports.formVersion'),
      render: (row) => `#${row.formVersionId}`,
    },
    {
      id: 'reportType',
      label: t('reports.type'),
      minWidth: 120,
      mobileLabel: t('reports.type'),
      render: (row) => (
        <Chip
          label={row.reportType === 'POSITIVE' ? t('reports.positive') : t('reports.negative')}
          color={row.reportType === 'POSITIVE' ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    {
      id: 'active',
      label: t('reports.status'),
      minWidth: 100,
      mobileLabel: t('reports.status'),
      render: (row) => (
        <Chip
          label={row.active ? t('reports.active') : t('reports.inactive')}
          color={row.active ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'createdAt',
      label: 'Data de Criação',
      minWidth: 120,
      mobileLabel: 'Data',
      render: (row) => new Date(row.createdAt).toLocaleDateString('pt-BR'),
    },
  ];

  // Coluna de ações (sempre por último)
  const actionsColumn: Column<Report> = {
    id: 'actions',
    label: t('reports.actions'),
    minWidth: 80,
    align: 'right',
    render: (row) => (
      <>
        <IconButton
          size="small"
          onClick={(e) => handleMenuOpen(e, row)}
          title={t('reports.actions')}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </>
    ),
  };

  // Combinar colunas: base + formResponse + ações (sempre por último)
  const columns: Column<Report>[] = [
    ...baseColumns,
    ...(appliedFilters.formIdFilter && formDefinition ? getFormResponseColumns() : []),
    actionsColumn,
  ];

  // Função para exportar CSV
  const handleExportCSV = () => {
    if (!data?.data || data.data.length === 0 || !appliedFilters.formIdFilter) {
      return;
    }

    // Cabeçalhos
    const headers = [
      'ID',
      'Participação',
      'Versão do Formulário',
      'Tipo',
      'Status',
      'Data de Criação',
      ...(formDefinition?.fields.map((f) => f.label || f.name) || []),
    ];

    // Linhas de dados
    const rows = data.data.map((report) => {
      const formResponse = report.formResponse || {};
      return [
        report.id.toString(),
        report.participationId.toString(),
        report.formVersionId.toString(),
        report.reportType === 'POSITIVE' ? 'Positivo' : 'Negativo',
        report.active ? 'Ativo' : 'Inativo',
        new Date(report.createdAt).toLocaleDateString('pt-BR'),
        ...(formDefinition?.fields.map((field) => {
          const value = formResponse[field.name];
          const formatted = formatFormResponseValue(value, field);
          // Escapar aspas e quebras de linha para CSV
          return formatted.replace(/"/g, '""');
        }) || []),
      ];
    });

    // Criar conteúdo CSV
    const csvContent = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    ].join('\n');

    // Criar blob e download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `reports_${appliedFilters.formIdFilter}_${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const forms = formsData?.data || [];

  const syncDraftWithApplied = (next: ReportListFilters) => {
    setAppliedFilters(next);
    setDraftFilters(next);
  };

  const filters = [
    ...(appliedFilters.activeFilter !== undefined
      ? [
          {
            label: t('reports.status'),
            value: appliedFilters.activeFilter ? t('reports.active') : t('reports.inactive'),
            onDelete: () => {
              const cleared: ReportListFilters = {
                ...appliedFilters,
                activeFilter: undefined,
              };
              syncDraftWithApplied(cleared);
              setPage(1);
            },
          },
        ]
      : []),
    ...(appliedFilters.reportTypeFilter
      ? [
          {
            label: t('reports.type'),
            value:
              appliedFilters.reportTypeFilter === 'POSITIVE'
                ? t('reports.positive')
                : t('reports.negative'),
            onDelete: () => {
              const cleared: ReportListFilters = {
                ...appliedFilters,
                reportTypeFilter: undefined,
              };
              syncDraftWithApplied(cleared);
              setPage(1);
            },
          },
        ]
      : []),
    ...(appliedFilters.formIdFilter
      ? [
          {
            label: t('reports.form'),
            value:
              forms.find((f) => f.id === appliedFilters.formIdFilter)?.title ||
              `#${appliedFilters.formIdFilter}`,
            onDelete: () => {
              const cleared: ReportListFilters = {
                ...appliedFilters,
                formIdFilter: undefined,
              };
              syncDraftWithApplied(cleared);
              setPage(1);
            },
          },
        ]
      : []),
    ...(appliedFilters.startDate && appliedFilters.endDate
      ? [
          {
            label: t('reports.startDate'),
            value: `${new Date(appliedFilters.startDate).toLocaleDateString('pt-BR')} - ${new Date(appliedFilters.endDate).toLocaleDateString('pt-BR')}`,
            onDelete: () => {
              const cleared: ReportListFilters = {
                ...appliedFilters,
                startDate: '',
                endDate: '',
              };
              syncDraftWithApplied(cleared);
              setPage(1);
            },
          },
        ]
      : []),
  ];

  if (error) {
    return <ErrorAlert message={t('reports.errorLoading')} />;
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Typography variant="h4">{t('reports.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<MapIcon />}
            onClick={() => navigate('/reports/map')}
          >
            {t('reports.mapView')}
          </Button>
          {appliedFilters.formIdFilter && data?.data && data.data.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              color="success"
            >
              Exportar CSV
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/reports/new')}
          >
            {t('reports.newReport')}
          </Button>
        </Box>
      </Box>

      <Stack spacing={2} sx={{ width: '100%' }}>
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">{t('reports.filters')}</Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth required sx={{ minWidth: 200 }}>
                <InputLabel>{t('reports.form')}</InputLabel>
                <Select
                  value={draftFilters.formIdFilter || ''}
                  label={t('reports.form')}
                  onChange={(e) =>
                    setDraftFilters((d) => ({
                      ...d,
                      formIdFilter: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  required
                  error={!draftFilters.formIdFilter}
                >
                  {formsLoading ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} />
                    </MenuItem>
                  ) : (
                    forms.map((form: any) => (
                      <MenuItem key={form.id} value={form.id}>
                        {form.title}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <TextField
                label={t('reports.startDate')}
                type="date"
                value={draftFilters.startDate}
                onChange={(e) =>
                  setDraftFilters((d) => ({ ...d, startDate: e.target.value }))
                }
                InputLabelProps={{
                  shrink: true,
                }}
                fullWidth
              />

              <TextField
                label={t('reports.endDate')}
                type="date"
                value={draftFilters.endDate}
                onChange={(e) =>
                  setDraftFilters((d) => ({ ...d, endDate: e.target.value }))
                }
                InputLabelProps={{
                  shrink: true,
                }}
                fullWidth
              />
            </Stack>

            {draftDateRangeInvalid && (
              <Alert severity="error">
                {t('reports.invalidDateRange')}
              </Alert>
            )}

            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={applyFiltersFromDraft}
                disabled={
                  !draftFilters.formIdFilter || draftDateRangeInvalid || !currentContext?.id
                }
              >
                {t('common.search')}
              </Button>
              <Button
                variant={draftFilters.activeFilter === true ? 'contained' : 'outlined'}
                size="small"
                onClick={() =>
                  setDraftFilters((d) => ({
                    ...d,
                    activeFilter: d.activeFilter === true ? undefined : true,
                  }))
                }
              >
                {t('reports.active')}
              </Button>
              <Button
                variant={draftFilters.activeFilter === false ? 'contained' : 'outlined'}
                size="small"
                onClick={() =>
                  setDraftFilters((d) => ({
                    ...d,
                    activeFilter: d.activeFilter === false ? undefined : false,
                  }))
                }
              >
                {t('reports.inactive')}
              </Button>
              <Button
                variant={draftFilters.reportTypeFilter === 'POSITIVE' ? 'contained' : 'outlined'}
                size="small"
                onClick={() =>
                  setDraftFilters((d) => ({
                    ...d,
                    reportTypeFilter:
                      d.reportTypeFilter === 'POSITIVE' ? undefined : 'POSITIVE',
                  }))
                }
              >
                {t('reports.positive')}
              </Button>
              <Button
                variant={draftFilters.reportTypeFilter === 'NEGATIVE' ? 'contained' : 'outlined'}
                size="small"
                onClick={() =>
                  setDraftFilters((d) => ({
                    ...d,
                    reportTypeFilter:
                      d.reportTypeFilter === 'NEGATIVE' ? undefined : 'NEGATIVE',
                  }))
                }
              >
                {t('reports.negative')}
              </Button>
            </Box>
          </Stack>
        </Paper>

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setDraftFilters(defaultDraftFilters());
            setAppliedFilters(emptyAppliedFilters());
            setPage(1);
          }}
        />

        {!appliedFilters.formIdFilter ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              Selecione um formulário para visualizar os reports em formato de tabela.
            </Alert>
          </Paper>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data || []}
            page={page}
            pageSize={pageSize}
            totalItems={data?.meta.totalItems || 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            loading={isLoading || isFetching}
            variant="table"
          />
        )}
      </Stack>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleView}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          {t('common.view')}
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          {t('common.edit')}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          {t('common.delete')}
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('reports.deleteConfirm')}
        message={t('reports.deleteMessage')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setReportToDelete(null);
        }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}

