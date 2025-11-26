import {
  TablePagination,
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { isValidElement } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export interface Column<T> {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  render?: (row: T) => ReactNode;
  mobileLabel?: string; // Label específico para mobile
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export default function DataTable<T extends { id: number }>({
  columns,
  data,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  loading = false,
  emptyMessage,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const defaultEmptyMessage = emptyMessage || t('common.noResults');
  const handleChangePage = (_: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPageSizeChange(parseInt(event.target.value, 10));
  };

  return (
    <Box>
      {loading ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography>{t('common.loading')}</Typography>
        </Box>
      ) : data.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">{defaultEmptyMessage}</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {data.map((row) => (
            <Card key={row.id} variant="outlined">
              <CardContent>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, 1fr)',
                      md: 'repeat(3, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  {columns.map((column) => {
                    const value = (row as any)[column.id];
                    const displayValue = column.render ? column.render(row) : value;
                    const label = column.mobileLabel || column.label;

                    // Não renderizar coluna de ações no corpo do card (será renderizada separadamente)
                    if (column.id === 'actions') {
                      return null;
                    }

                    // Verificar se displayValue é um elemento React (não apenas texto/number)
                    const isReactElement = isValidElement(displayValue);

                    return (
                      <Box key={column.id}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          {label}
                        </Typography>
                        {isReactElement ? (
                          displayValue
                        ) : (
                          <Typography variant="body2">{displayValue || '-'}</Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
                {/* Ações no final do card */}
                {columns.find((col) => col.id === 'actions') && (
                  <Box sx={{ pt: 2, mt: 2, borderTop: 1, borderColor: 'divider' }}>
                    {columns
                      .find((col) => col.id === 'actions')
                      ?.render?.(row)}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      <TablePagination
        component="div"
        count={totalItems}
        rowsPerPage={pageSize}
        page={page - 1}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 20, 50, 100]}
        labelRowsPerPage={t('common.itemsPerPage') + ':'}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${t('common.of')} ${count}`}
        sx={{ 
          mt: 2,
          '& .MuiTablePagination-toolbar': {
            flexWrap: 'wrap',
            gap: 1,
          },
        }}
      />
    </Box>
  );
}
