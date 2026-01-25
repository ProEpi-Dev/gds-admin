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
} from '@mui/icons-material';
import { useReports, useDeleteReport } from '../hooks/useReports';
import { useForms } from '../../forms/hooks/useForms';
import { useFormVersions } from '../../forms/hooks/useFormVersions';
import type { FormBuilderDefinition, FormField } from '../../../types/form-builder.types';
import DataTable, { type Column } from '../../../components/common/DataTable';
import FilterChips from '../../../components/common/FilterChips';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTranslation } from '../../../hooks/useTranslation';
import type { Report } from '../../../types/report.types';

const STORAGE_KEY = 'reports-filters';

interface SavedFilters {
  page: number;
  pageSize: number;
  activeFilter: boolean | undefined;
  reportTypeFilter: string | undefined;
  formIdFilter: number | undefined;
  startDate: string;
  endDate: string;
}

export default function ReportsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Função para carregar filtros do localStorage
  const loadFiltersFromStorage = (): SavedFilters | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar filtros do localStorage:', error);
    }
    return null;
  };

  // Função para salvar filtros no localStorage
  const saveFiltersToStorage = (filters: SavedFilters) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Erro ao salvar filtros no localStorage:', error);
    }
  };

  // Carregar filtros salvos ao montar o componente
  const savedFilters = loadFiltersFromStorage();

  const [page, setPage] = useState(savedFilters?.page || 1);
  const [pageSize, setPageSize] = useState(savedFilters?.pageSize || 20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(savedFilters?.activeFilter);
  const [reportTypeFilter, setReportTypeFilter] = useState<string | undefined>(savedFilters?.reportTypeFilter);
  const [formIdFilter, setFormIdFilter] = useState<number | undefined>(savedFilters?.formIdFilter);
  const [startDate, setStartDate] = useState<string>(savedFilters?.startDate || '');
  const [endDate, setEndDate] = useState<string>(savedFilters?.endDate || '');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Salvar filtros no localStorage sempre que mudarem
  useEffect(() => {
    saveFiltersToStorage({
      page,
      pageSize,
      activeFilter,
      reportTypeFilter,
      formIdFilter,
      startDate,
      endDate,
    });
  }, [page, pageSize, activeFilter, reportTypeFilter, formIdFilter, startDate, endDate]);

  // Buscar formulários para o filtro (apenas do tipo signal)
  const { data: formsData, isLoading: formsLoading } = useForms({
    page: 1,
    pageSize: 100,
    active: true,
    type: 'signal', // Filtrar apenas formulários do tipo signal
  });

  // Buscar versões do formulário selecionado para obter a definição
  const { data: versionsData } = useFormVersions(formIdFilter || null, { page: 1, pageSize: 50, active: true });

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

  const { data, isLoading, error } = useReports({
    page,
    pageSize,
    active: activeFilter,
    reportType: reportTypeFilter as 'POSITIVE' | 'NEGATIVE' | undefined,
    formId: formIdFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

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
    ...(formIdFilter && formDefinition ? getFormResponseColumns() : []),
    actionsColumn,
  ];

  // Função para exportar CSV
  const handleExportCSV = () => {
    if (!data?.data || data.data.length === 0 || !formIdFilter) {
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
    link.setAttribute('download', `reports_${formIdFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const forms = formsData?.data || [];

  const filters = [
    ...(activeFilter !== undefined
      ? [
          {
            label: t('reports.status'),
            value: activeFilter ? t('reports.active') : t('reports.inactive'),
            onDelete: () => setActiveFilter(undefined),
          },
        ]
      : []),
    ...(reportTypeFilter
      ? [
          {
            label: t('reports.type'),
            value: reportTypeFilter === 'POSITIVE' ? t('reports.positive') : t('reports.negative'),
            onDelete: () => setReportTypeFilter(undefined),
          },
        ]
      : []),
    ...(formIdFilter
      ? [
          {
            label: t('reports.form'),
            value: forms.find((f) => f.id === formIdFilter)?.title || `#${formIdFilter}`,
            onDelete: () => setFormIdFilter(undefined),
          },
        ]
      : []),
    ...(startDate && endDate
      ? [
          {
            label: t('reports.startDate'),
            value: `${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(endDate).toLocaleDateString('pt-BR')}`,
            onDelete: () => {
              setStartDate('');
              setEndDate('');
            },
          },
        ]
      : []),
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

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
          {formIdFilter && data?.data && data.data.length > 0 && (
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
                  value={formIdFilter || ''}
                  label={t('reports.form')}
                  onChange={(e) => setFormIdFilter(e.target.value ? Number(e.target.value) : undefined)}
                  required
                  error={!formIdFilter}
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
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                fullWidth
              />

              <TextField
                label={t('reports.endDate')}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                fullWidth
              />
            </Stack>

            {startDate && endDate && new Date(startDate) > new Date(endDate) && (
              <Alert severity="error">
                {t('reports.invalidDateRange')}
              </Alert>
            )}

            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant={activeFilter === true ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setActiveFilter(activeFilter === true ? undefined : true)}
              >
                {t('reports.active')}
              </Button>
              <Button
                variant={activeFilter === false ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setActiveFilter(activeFilter === false ? undefined : false)}
              >
                {t('reports.inactive')}
              </Button>
              <Button
                variant={reportTypeFilter === 'POSITIVE' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setReportTypeFilter(reportTypeFilter === 'POSITIVE' ? undefined : 'POSITIVE')}
              >
                {t('reports.positive')}
              </Button>
              <Button
                variant={reportTypeFilter === 'NEGATIVE' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setReportTypeFilter(reportTypeFilter === 'NEGATIVE' ? undefined : 'NEGATIVE')}
              >
                {t('reports.negative')}
              </Button>
            </Box>
          </Stack>
        </Paper>

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setActiveFilter(undefined);
            setReportTypeFilter(undefined);
            setFormIdFilter(undefined);
            setStartDate('');
            setEndDate('');
            setPage(1);
            // Limpar do localStorage também
            localStorage.removeItem(STORAGE_KEY);
          }}
        />

        {!formIdFilter ? (
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
            loading={isLoading}
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

