import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import DataTable, { type Column } from '../../../components/common/DataTable';
import FilterChips from '../../../components/common/FilterChips';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTranslation } from '../../../hooks/useTranslation';
import { useDebounce } from '../../../hooks/useDebounce';
import { useCurrentContext } from '../../../contexts/CurrentContextContext';
import { auditLogsService } from '../../../api/services/audit-logs.service';
import type { AuditLog } from '../../../types/audit-log.types';
import { formatDateTimeFromApi } from '../../../utils/formatDateOnlyFromApi';

function formatAuditMetadata(meta: Record<string, unknown> | null | undefined): string {
  if (meta == null || typeof meta !== 'object' || Object.keys(meta).length === 0) {
    return '—';
  }
  try {
    return JSON.stringify(meta);
  } catch {
    return '—';
  }
}

const ACTION_OPTIONS = [
  'CONTEXT_CONFIGURATION_UPDATE',
  'CONTEXT_CREATE',
  'CONTEXT_SOFT_DELETE',
  'CONTEXT_UPDATE',
  'INTEGRATION_CONFIG_UPDATE',
  'PARTICIPATION_PERMANENT_DELETE',
  'PARTICIPATION_REACTIVATE',
  'PARTICIPATION_ROLE_ADD',
  'PARTICIPATION_ROLE_REMOVE',
  'PARTICIPATION_SOFT_DELETE',
  'USER_ROLE_CHANGE',
];

export default function AuditLogsListPage() {
  const { t, currentLanguage } = useTranslation();
  const { currentContext } = useCurrentContext();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const debouncedSearch = useDebounce(searchInput, 400);

  const query = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      action: actionFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      contextId: currentContext?.id,
      sortDirection: 'desc' as const,
    }),
    [page, pageSize, debouncedSearch, actionFilter, dateFrom, dateTo, currentContext?.id],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => auditLogsService.findAll(query),
  });

  const columns: Column<AuditLog>[] = [
    {
      id: 'occurredAt',
      label: t('auditLogs.occurredAt'),
      minWidth: 170,
      mobileLabel: t('auditLogs.occurredAt'),
      render: (row) => formatDateTimeFromApi(row.occurredAt, currentLanguage),
    },
    {
      id: 'action',
      label: t('auditLogs.action'),
      minWidth: 180,
      mobileLabel: t('auditLogs.action'),
      render: (row) => <Chip label={row.action} size="small" />,
    },
    {
      id: 'actor',
      label: t('auditLogs.actor'),
      minWidth: 190,
      mobileLabel: t('auditLogs.actor'),
      render: (row) => {
        if (!row.actorUserId) return t('auditLogs.systemActor');
        return row.actorName
          ? `${row.actorName} (${row.actorEmail ?? `#${row.actorUserId}`})`
          : row.actorEmail ?? `#${row.actorUserId}`;
      },
    },
    {
      id: 'target',
      label: t('auditLogs.target'),
      minWidth: 190,
      mobileLabel: t('auditLogs.target'),
      render: (row) => `${row.targetEntityType} #${row.targetEntityId}`,
    },
    {
      id: 'metadata',
      label: t('auditLogs.metadata'),
      minWidth: 200,
      mobileLabel: t('auditLogs.metadata'),
      render: (row) => {
        const text = formatAuditMetadata(row.metadata);
        if (text === '—') {
          return (
            <Typography variant="body2" color="text.secondary">
              {text}
            </Typography>
          );
        }
        return (
          <Tooltip
            title={
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1,
                  maxWidth: 480,
                  maxHeight: 320,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.75rem',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {text}
              </Box>
            }
            placement="top-start"
            enterDelay={400}
          >
            <Typography
              variant="body2"
              component="span"
              sx={{
                display: 'block',
                maxWidth: { xs: 200, sm: 280 },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.8rem',
                cursor: 'default',
              }}
            >
              {text}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      id: 'context',
      label: t('auditLogs.context'),
      minWidth: 140,
      mobileLabel: t('auditLogs.context'),
      render: (row) =>
        row.contextName ?? (row.contextId ? `#${row.contextId}` : t('auditLogs.noContext')),
    },
    {
      id: 'channel',
      label: t('auditLogs.channel'),
      minWidth: 120,
      mobileLabel: t('auditLogs.channel'),
      render: (row) => row.channel ?? '-',
    },
  ];

  const filters = [
    ...(actionFilter
      ? [
          {
            label: t('auditLogs.action'),
            value: actionFilter,
            onDelete: () => setActionFilter(''),
          },
        ]
      : []),
    ...(debouncedSearch
      ? [
          {
            label: t('common.search'),
            value: debouncedSearch,
            onDelete: () => setSearchInput(''),
          },
        ]
      : []),
    ...(dateFrom
      ? [
          {
            label: t('auditLogs.dateFrom'),
            value: dateFrom,
            onDelete: () => setDateFrom(''),
          },
        ]
      : []),
    ...(dateTo
      ? [
          {
            label: t('auditLogs.dateTo'),
            value: dateTo,
            onDelete: () => setDateTo(''),
          },
        ]
      : []),
  ];

  return (
    <>
      {error && <ErrorAlert message={t('auditLogs.errorLoading')} />}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4">{t('auditLogs.title')}</Typography>
          {currentContext && (
            <Typography variant="body2" color="text.secondary">
              {currentContext.name}
            </Typography>
          )}
        </Box>
      </Box>

      <Stack spacing={2}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <TextField
            size="small"
            label={t('common.search')}
            placeholder={t('auditLogs.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ minWidth: 260, flex: { sm: '1 1 280px' }, maxWidth: { sm: 420 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            size="small"
            label={t('auditLogs.action')}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="">{t('auditLogs.allActions')}</MenuItem>
            {ACTION_OPTIONS.map((action) => (
              <MenuItem key={action} value={action}>
                {action}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type="date"
            size="small"
            label={t('auditLogs.dateFrom')}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            size="small"
            label={t('auditLogs.dateTo')}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="outlined"
            onClick={() => {
              setSearchInput('');
              setActionFilter('');
              setDateFrom('');
              setDateTo('');
            }}
          >
            {t('common.clear')}
          </Button>
        </Box>

        <FilterChips filters={filters} onClearAll={() => {
          setSearchInput('');
          setActionFilter('');
          setDateFrom('');
          setDateTo('');
        }} />

        <DataTable
          columns={columns}
          data={data?.data || []}
          page={page}
          pageSize={pageSize}
          totalItems={data?.meta.totalItems || 0}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={isLoading}
          emptyMessage={t('auditLogs.empty')}
          variant="table"
        />
      </Stack>
    </>
  );
}
