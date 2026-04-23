import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import UserLayout from "../../../components/layout/UserLayout";
import { reportsService } from "../../../api/services/reports.service";
import { hasModule, resolveEnabledModules } from "../utils/contextModules";
import CommunitySignalsCalendarPanel from "../components/CommunitySignalsCalendarPanel";
import ParticipationStreakMonthCalendar from "../components/ParticipationStreakMonthCalendar";

export default function AppDaysPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const participation = user?.participation;
  const contextId = participation?.context.id;
  const participationId = participation?.id;
  const enabledModules = resolveEnabledModules(participation?.context.modules);
  const selfHealthEnabled = hasModule(enabledModules, "self_health");
  const communitySignalEnabled = hasModule(enabledModules, "community_signal");

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
    enabled: Boolean(contextId && participationId && selfHealthEnabled),
  });

  const reportedDaySet = useMemo(() => {
    return new Set((data?.reportedDays ?? []).map((row) => row.date));
  }, [data]);

  if (!selfHealthEnabled && !communitySignalEnabled) {
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

        {selfHealthEnabled && (
          <>
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
              <ParticipationStreakMonthCalendar
                month={currentMonth}
                onPrevMonth={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                onNextMonth={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                reportedDaySet={reportedDaySet}
                isLoading={isLoading}
              />
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
          </>
        )}

        {communitySignalEnabled && <CommunitySignalsCalendarPanel />}
      </Stack>
    </UserLayout>
  );
}

