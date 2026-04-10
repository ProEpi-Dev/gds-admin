import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  LocalFireDepartment as LocalFireDepartmentIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DataTable, { type Column } from "../../../components/common/DataTable";
import ErrorAlert from "../../../components/common/ErrorAlert";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { useCurrentContext } from "../../../contexts/CurrentContextContext";
import { useTranslation } from "../../../hooks/useTranslation";
import {
  useContextReportStreaks,
  useParticipationReportStreak,
} from "../hooks/useReports";
import type { ReportStreakSummary } from "../../../types/report.types";
import ReportStreakCalendar from "../components/ReportStreakCalendar";

type ReportStreakRow = ReportStreakSummary & { id: number };

function getMonthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, monthIndex - 1, 1));
  const endDate = new Date(Date.UTC(year, monthIndex, 0));

  return {
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
  };
}

function formatDateLabel(value: string | null) {
  if (!value) return "-";
  return format(new Date(`${value}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
}

export default function ReportStreaksPage() {
  const { t } = useTranslation();
  const { currentContext } = useCurrentContext();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [selectedParticipationId, setSelectedParticipationId] = useState<
    number | null
  >(null);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    format(new Date(), "yyyy-MM"),
  );

  const monthRange = useMemo(
    () => getMonthRange(selectedMonth),
    [selectedMonth],
  );

  const { data, isLoading, error } = useContextReportStreaks(
    currentContext?.id ?? null,
    {
      page,
      pageSize,
      active: activeFilter,
      search,
    },
  );

  const rows: ReportStreakRow[] = useMemo(
    () =>
      (data?.data || []).map((item) => ({
        ...item,
        id: item.participationId,
      })),
    [data],
  );

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedParticipationId(null);
      return;
    }

    if (
      !selectedParticipationId ||
      !rows.some((row) => row.participationId === selectedParticipationId)
    ) {
      setSelectedParticipationId(rows[0].participationId);
    }
  }, [rows, selectedParticipationId]);

  const {
    data: participationStreak,
    isLoading: isDetailLoading,
    error: detailError,
  } = useParticipationReportStreak(
    currentContext?.id ?? null,
    selectedParticipationId,
    monthRange,
  );

  const columns: Column<ReportStreakRow>[] = [
    {
      id: "userName",
      label: t("participations.user"),
      minWidth: 220,
      mobileLabel: t("participations.user"),
      render: (row) => (
        <Box>
          <Typography variant="body2">{row.userName}</Typography>
          <Typography variant="caption" color="text.secondary">
            {row.userEmail}
          </Typography>
        </Box>
      ),
    },
    {
      id: "currentStreak",
      label: t("reportStreaks.currentStreak"),
      minWidth: 140,
      mobileLabel: t("reportStreaks.currentStreak"),
      render: (row) => (
        <Chip
          icon={<LocalFireDepartmentIcon />}
          label={`${row.currentStreak} ${t("reportStreaks.daysShort")}`}
          color={row.currentStreak > 0 ? "warning" : "default"}
          size="small"
        />
      ),
    },
    {
      id: "longestStreak",
      label: t("reportStreaks.longestStreak"),
      minWidth: 140,
      mobileLabel: t("reportStreaks.longestStreak"),
      render: (row) => `${row.longestStreak} ${t("reportStreaks.daysShort")}`,
    },
    {
      id: "reportedDaysCount",
      label: t("reportStreaks.reportedDaysCount"),
      minWidth: 140,
      mobileLabel: t("reportStreaks.reportedDaysCount"),
      render: (row) => row.reportedDaysCount,
    },
    {
      id: "lastReportedDate",
      label: t("reportStreaks.lastReportedDate"),
      minWidth: 150,
      mobileLabel: t("reportStreaks.lastReportedDate"),
      render: (row) => formatDateLabel(row.lastReportedDate),
    },
    {
      id: "actions",
      label: t("common.actions"),
      minWidth: 160,
      align: "right",
      render: (row) => (
        <Button
          variant={
            selectedParticipationId === row.participationId
              ? "contained"
              : "outlined"
          }
          size="small"
          onClick={() => setSelectedParticipationId(row.participationId)}
        >
          {t("reportStreaks.viewDetails")}
        </Button>
      ),
    },
  ];

  if (!currentContext) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={t("reportStreaks.errorLoadingSummary")} />;
  }

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h4" component="h1">
          {t("reportStreaks.title")}
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 1,
            width: { xs: "100%", sm: "fit-content" },
            maxWidth: "100%",
            alignSelf: { xs: "stretch", sm: "flex-end" },
            minWidth: 0,
          }}
        >
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="flex-start"
            justifyContent="flex-start"
            sx={{
              width: "100%",
              color: "text.secondary",
              opacity: 0.92,
            }}
          >
            <ScheduleIcon
              sx={{
                fontSize: 18,
                mt: "1px",
                flexShrink: 0,
                color: "action.active",
              }}
            />
            <Typography
              variant="caption"
              component="p"
              sx={{
                m: 0,
                lineHeight: 1.4,
                textAlign: "left",
                flex: "1 1 auto",
                minWidth: 0,
              }}
            >
              {t("reportStreaks.timezoneHint")}
            </Typography>
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent={{ xs: "stretch", sm: "flex-end" }}
            flexWrap="nowrap"
            sx={{ width: "100%" }}
          >
            <TextField
              label={t("reportStreaks.searchLabel")}
              placeholder={t("reportStreaks.searchPlaceholder")}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setPage(1);
                  setSearch(searchInput.trim() || undefined);
                }
              }}
              size="small"
              sx={{
                minWidth: { sm: 220 },
                flex: { sm: "1 1 200px" },
              }}
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              size="small"
              onClick={() => {
                setPage(1);
                setSearch(searchInput.trim() || undefined);
              }}
              sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {t("common.search")}
            </Button>
            <Button
              variant={activeFilter === true ? "contained" : "outlined"}
              size="small"
              onClick={() => {
                setPage(1);
                setActiveFilter(activeFilter === true ? undefined : true);
              }}
              sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {t("reportStreaks.activeOnly")}
            </Button>
          </Stack>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <DataTable
          columns={columns}
          data={rows}
          page={page}
          pageSize={pageSize}
          totalItems={data?.meta.totalItems || 0}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={isLoading}
          emptyMessage={t("reportStreaks.noParticipants")}
          variant="table"
        />
      </Paper>

      <Paper sx={{ p: 3 }}>
        {!selectedParticipationId ? (
          <Alert severity="info">
            {t("reportStreaks.noParticipationSelected")}
          </Alert>
        ) : detailError ? (
          <ErrorAlert message={t("reportStreaks.errorLoadingDetail")} />
        ) : isDetailLoading || !participationStreak ? (
          <LoadingSpinner />
        ) : (
          <Stack spacing={3}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box>
                <Typography variant="h5">
                  {participationStreak.userName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {participationStreak.userEmail}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {t("reportStreaks.currentStreakText", {
                    count: participationStreak.currentStreak,
                  })}
                </Typography>
              </Box>

              <TextField
                label={t("reportStreaks.month")}
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {t("reportStreaks.currentStreak")}
                </Typography>
                <Typography variant="h5">
                  {participationStreak.currentStreak}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {t("reportStreaks.longestStreak")}
                </Typography>
                <Typography variant="h5">
                  {participationStreak.longestStreak}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {t("reportStreaks.reportedDaysCount")}
                </Typography>
                <Typography variant="h5">
                  {participationStreak.reportedDaysCount}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {t("reportStreaks.lastReportedDate")}
                </Typography>
                <Typography variant="h5">
                  {formatDateLabel(participationStreak.lastReportedDate)}
                </Typography>
              </Paper>
            </Box>

            <ReportStreakCalendar
              month={selectedMonth}
              reportedDays={participationStreak.reportedDays}
            />

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {t("reportStreaks.daysInPeriod", {
                  count: participationStreak.reportedDaysInRangeCount,
                })}
              </Typography>

              {participationStreak.reportedDays.length === 0 ? (
                <Alert severity="info">
                  {t("reportStreaks.noReportedDaysInPeriod")}
                </Alert>
              ) : (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {participationStreak.reportedDays.map((day) => (
                    <Chip
                      key={day.date}
                      color="success"
                      variant="outlined"
                      label={`${formatDateLabel(day.date)} · ${day.reportCount}`}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
