import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useReports, useDeleteReport } from '../hooks/useReports';
import DataTable, { type Column } from '../../../components/common/DataTable';
import FilterChips from '../../../components/common/FilterChips';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTranslation } from '../../../hooks/useTranslation';
import type { Report } from '../../../types/report.types';

export default function ReportsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [reportTypeFilter, setReportTypeFilter] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

  const { data, isLoading, error } = useReports({
    page,
    pageSize,
    active: activeFilter,
    reportType: reportTypeFilter as 'POSITIVE' | 'NEGATIVE' | undefined,
  });

  const deleteMutation = useDeleteReport();

  const handleDelete = (report: Report) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
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

  const columns: Column<Report>[] = [
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
      id: 'actions',
      label: t('reports.actions'),
      minWidth: 120,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/reports/${row.id}`)}
            title={t('common.view')}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/reports/${row.id}/edit`)}
            title={t('common.edit')}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(row)}
            color="error"
            title={t('common.delete')}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/reports/new')}
        >
          {t('reports.newReport')}
        </Button>
      </Box>

      <Stack spacing={2} sx={{ width: '100%' }}>
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

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setActiveFilter(undefined);
            setReportTypeFilter(undefined);
          }}
        />

        <DataTable
          columns={columns}
          data={data?.data || []}
          page={page}
          pageSize={pageSize}
          totalItems={data?.meta.totalItems || 0}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={isLoading}
        />
      </Stack>

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

