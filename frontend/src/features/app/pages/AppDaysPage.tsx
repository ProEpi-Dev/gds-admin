import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import {
  addDays,
  addMonths,
  isSameDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import UserLayout from "../../../components/layout/UserLayout";
import { reportsService } from "../../../api/services/reports.service";
import { hasModule, resolveEnabledModules } from "../utils/contextModules";

export default function AppDaysPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const participation = user?.participation;
  const contextId = participation?.context.id;
  const participationId = participation?.id;
  const enabledModules = resolveEnabledModules(participation?.context.modules);
  const selfHealthEnabled = hasModule(enabledModules, "self_health");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const rangeStart = format(monthStart, "yyyy-MM-dd");
  const rangeEnd = format(monthEnd, "yyyy-MM-dd");

  const { data, isLoading, error } = useQuery({
    queryKey: ["app-days-streak", contextId, participationId, rangeStart, rangeEnd],
    queryFn: () =>
      reportsService.findParticipationReportStreak(contextId!, participationId!, {
        startDate: rangeStart,
        endDate: rangeEnd,
      }),
    enabled: Boolean(contextId && participationId),
  });

  const reportedDaySet = useMemo(() => {
    return new Set((data?.reportedDays ?? []).map((row) => row.date));
  }, [data]);

  const days = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const next: Date[] = [];
    let day = start;
    while (day <= end) {
      next.push(day);
      day = addDays(day, 1);
    }
    return next;
  }, [monthEnd, monthStart]);

  if (!selfHealthEnabled) {
    return <Navigate to="/app/inicio" replace />;
  }

  return (
    <UserLayout>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={700}>
          Dias
        </Typography>

        {!participationId && (
          <Alert severity="warning">
            Sua conta não possui participação ativa para visualizar os reports por
            dia.
          </Alert>
        )}

        {error && (
          <Alert severity="error">
            Não foi possível carregar o calendário de reports.
          </Alert>
        )}

        {data && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="body1" color="text.secondary">
              Você participou por{" "}
              <Box component="span" sx={{ fontWeight: 800, color: "text.primary" }}>
                {data.currentStreak} dia{data.currentStreak === 1 ? "" : "s"}
              </Box>{" "}
              seguido{data.currentStreak === 1 ? "" : "s"}.
            </Typography>
          </Paper>
        )}

        <Paper sx={{ p: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <IconButton onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6" textTransform="capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </Typography>
            <IconButton onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>

          {isLoading ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                gap: 1,
              }}
            >
              {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => (
                <Typography
                  key={`${label}-${index}`}
                  variant="caption"
                  color="primary.main"
                  align="center"
                  sx={{ fontWeight: 700 }}
                >
                  {label}
                </Typography>
              ))}
              {days.map((day) => {
                const iso = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, currentMonth);
                const marked = reportedDaySet.has(iso);
                const isToday = isSameDay(day, new Date());
                return (
                  <Box
                    key={iso}
                    sx={{
                      minHeight: 44,
                      borderRadius: 1,
                      border: 1,
                      borderColor: marked
                        ? "#f57c00"
                        : isToday
                          ? "primary.main"
                          : "divider",
                      bgcolor: marked ? "#ffb74d" : "background.paper",
                      color: inMonth
                        ? marked
                          ? "#5d2f00"
                          : "text.primary"
                        : "text.disabled",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: marked || isToday ? 700 : 500,
                      opacity: inMonth ? 1 : 0.6,
                    }}
                  >
                    {format(day, "d")}
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>

        {data && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Paper sx={{ p: 2, flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Maior sequência
              </Typography>
              <Typography variant="h6">{data.longestStreak} dia(s)</Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Participação total
              </Typography>
              <Typography variant="h6">{data.reportedDaysCount} dia(s)</Typography>
            </Paper>
          </Stack>
        )}
      </Stack>
    </UserLayout>
  );
}

