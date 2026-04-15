import {
  TablePagination,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Stack,
  Skeleton,
  LinearProgress,
} from "@mui/material";
import { isValidElement } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "../../hooks/useTranslation";

export interface Column<T> {
  id: string;
  label: ReactNode;
  minWidth?: number;
  align?: "right" | "left" | "center";
  render?: (row: T) => ReactNode;
  /** Label específico para mobile (cards) */
  mobileLabel?: ReactNode;
}

type CardGridBreakpoint = "xs" | "sm" | "md" | "lg" | "xl";

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
  variant?: "cards" | "table";
  /** Sobrescreve colunas do grid nos cards (variante cards). Útil quando há 3 campos e se quer uma linha em sm+. */
  cardGridTemplateColumns?: Partial<Record<CardGridBreakpoint, string>>;
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
  variant = "cards",
  cardGridTemplateColumns,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const defaultEmptyMessage = emptyMessage || t("common.noResults");
  const handleChangePage = (_: unknown, newPage: number) => {
    onPageChange(newPage + 1);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onPageSizeChange(parseInt(event.target.value, 10));
  };

  const defaultCardGrid: Record<CardGridBreakpoint, string> = {
    xs: "1fr",
    sm: "repeat(2, 1fr)",
    md: "repeat(3, 1fr)",
    lg: "repeat(3, 1fr)",
    xl: "repeat(3, 1fr)",
  };
  const mergedCardGrid = { ...defaultCardGrid, ...cardGridTemplateColumns };

  const contentColumns = columns.filter((c) => c.id !== "actions");
  const hasActions = columns.some((c) => c.id === "actions");
  const skeletonRowCount = Math.min(Math.max(pageSize, 3), 8);

  const cardSkeletonList = (
    <Stack spacing={2}>
      {Array.from({ length: skeletonRowCount }).map((_, i) => (
        <Card key={`sk-card-${i}`} variant="outlined">
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: mergedCardGrid.xs,
                  sm: mergedCardGrid.sm,
                  md: mergedCardGrid.md,
                  lg: mergedCardGrid.lg,
                  xl: mergedCardGrid.xl,
                },
                gap: 2,
              }}
            >
              {contentColumns.map((col) => (
                <Box key={col.id}>
                  <Skeleton
                    variant="text"
                    width="42%"
                    height={18}
                    sx={{ mb: 0.75 }}
                  />
                  <Skeleton variant="text" width="88%" height={22} />
                </Box>
              ))}
              {hasActions && (
                <Box
                  sx={{
                    pt: 2,
                    mt: 1,
                    borderTop: 1,
                    borderColor: "divider",
                    gridColumn: { xs: "1 / -1", sm: "1 / -1" },
                  }}
                >
                  <Stack direction="row" spacing={1} justifyContent="flex-start">
                    <Skeleton variant="circular" width={34} height={34} />
                    <Skeleton variant="circular" width={34} height={34} />
                    <Skeleton variant="circular" width={34} height={34} />
                  </Stack>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  const tableSkeleton = (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{ maxHeight: "calc(100vh - 400px)", overflowX: "auto" }}
    >
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column, index) => {
              const isLastColumn = index === columns.length - 1;
              return (
                <TableCell
                  key={column.id}
                  align={column.align || "left"}
                  sx={{
                    minWidth: column.minWidth,
                    fontWeight: "bold",
                    ...(isLastColumn && {
                      position: "sticky",
                      right: 0,
                      backgroundColor: "background.paper",
                      zIndex: 12,
                      boxShadow: "-2px 0 4px rgba(0,0,0,0.1)",
                    }),
                  }}
                >
                  {column.label}
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: skeletonRowCount }).map((_, i) => (
            <TableRow key={`sk-row-${i}`}>
              {columns.map((column, index) => {
                const isLastColumn = index === columns.length - 1;
                return (
                  <TableCell
                    key={column.id}
                    align={column.align || "left"}
                    sx={{
                      minWidth: column.minWidth,
                      ...(isLastColumn && {
                        position: "sticky",
                        right: 0,
                        backgroundColor: "background.paper",
                        zIndex: 2,
                        boxShadow: "-2px 0 4px rgba(0,0,0,0.1)",
                      }),
                    }}
                  >
                    <Skeleton variant="text" width="90%" height={24} />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const showSkeletonOnly = loading && data.length === 0;
  const showBackgroundRefresh = loading && data.length > 0;

  return (
    <Box sx={{ position: "relative" }}>
      {showBackgroundRefresh && (
        <LinearProgress
          sx={{
            position: "absolute",
            top: -4,
            left: 0,
            right: 0,
            borderRadius: 1,
            zIndex: 1,
          }}
        />
      )}
      {showSkeletonOnly ? (
        variant === "table" ? tableSkeleton : cardSkeletonList
      ) : data.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography color="text.secondary">{defaultEmptyMessage}</Typography>
        </Box>
      ) : variant === "table" ? (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ maxHeight: "calc(100vh - 400px)", overflowX: "auto" }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column, index) => {
                  const isLastColumn = index === columns.length - 1;
                  return (
                    <TableCell
                      key={column.id}
                      align={column.align || "left"}
                      sx={{
                        minWidth: column.minWidth,
                        fontWeight: "bold",
                        ...(isLastColumn && {
                          position: "sticky",
                          right: 0,
                          backgroundColor: "background.paper",
                          zIndex: 12,
                          boxShadow: "-2px 0 4px rgba(0,0,0,0.1)",
                        }),
                      }}
                    >
                      {column.label}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id} hover>
                  {columns.map((column, index) => {
                    const cellValue = (row as any)[column.id];
                    const displayValue = column.render
                      ? column.render(row)
                      : cellValue;
                    const isReactElement = isValidElement(displayValue);
                    const isLastColumn = index === columns.length - 1;

                    return (
                      <TableCell
                        key={column.id}
                        align={column.align || "left"}
                        sx={{
                          minWidth: column.minWidth,
                          ...(isLastColumn && {
                            position: "sticky",
                            right: 0,
                            backgroundColor: "background.paper",
                            zIndex: 2,
                            boxShadow: "-2px 0 4px rgba(0,0,0,0.1)",
                          }),
                        }}
                      >
                        {isReactElement ? displayValue : (displayValue ?? "-")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Stack spacing={2}>
          {data.map((row) => (
            <Card key={row.id} variant="outlined">
              <CardContent>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: mergedCardGrid.xs,
                      sm: mergedCardGrid.sm,
                      md: mergedCardGrid.md,
                      lg: mergedCardGrid.lg,
                      xl: mergedCardGrid.xl,
                    },
                    gap: 2,
                  }}
                >
                  {columns.map((column) => {
                    const value = (row as any)[column.id];
                    const displayValue = column.render
                      ? column.render(row)
                      : value;
                    const label = column.mobileLabel || column.label;

                    // Não renderizar coluna de ações no corpo do card (será renderizada separadamente)
                    if (column.id === "actions") {
                      return null;
                    }

                    // Verificar se displayValue é um elemento React (não apenas texto/number)
                    const isReactElement = isValidElement(displayValue);

                    return (
                      <Box key={column.id}>
                        <Typography
                          component="div"
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mb: 0.5 }}
                        >
                          {label}
                        </Typography>
                        {isReactElement ? (
                          displayValue
                        ) : (
                          <Typography variant="body2">
                            {displayValue || "-"}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
                {/* Ações no final do card */}
                {columns.find((col) => col.id === "actions") && (
                  <Box
                    sx={{ pt: 2, mt: 2, borderTop: 1, borderColor: "divider" }}
                  >
                    {columns.find((col) => col.id === "actions")?.render?.(row)}
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
        labelRowsPerPage={t("common.itemsPerPage") + ":"}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} ${t("common.of")} ${count}`
        }
        sx={{
          mt: 2,
          "& .MuiTablePagination-toolbar": {
            flexWrap: "wrap",
            gap: 1,
          },
        }}
      />
    </Box>
  );
}
