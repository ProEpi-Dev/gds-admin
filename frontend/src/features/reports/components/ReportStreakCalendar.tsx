import { Box, Paper, Stack, Typography } from "@mui/material";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import type { ReportDaySummary } from "../../../types/report.types";

interface ReportStreakCalendarProps {
  month: string;
  reportedDays: ReportDaySummary[];
}

export default function ReportStreakCalendar({
  month,
  reportedDays,
}: ReportStreakCalendarProps) {
  const { currentLanguage } = useTranslation();
  const locale = currentLanguage.startsWith("pt") ? ptBR : enUS;

  const reportedDaysMap = useMemo(
    () => new Map(reportedDays.map((day) => [day.date, day])),
    [reportedDays],
  );

  const referenceDate = new Date(`${month}-01T12:00:00`);
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });
  const weekdayHeaders = calendarDays.slice(0, 7);

  return (
    <Stack spacing={2}>
      <Typography variant="h6">
        {format(referenceDate, "MMMM yyyy", { locale })}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 1,
        }}
      >
        {weekdayHeaders.map((day) => (
          <Typography
            key={`header-${day.toISOString()}`}
            variant="caption"
            sx={{
              px: 1,
              textTransform: "uppercase",
              color: "text.secondary",
              fontWeight: 700,
            }}
          >
            {format(day, "EEEEE", { locale })}
          </Typography>
        ))}

        {calendarDays.map((day) => {
          const isoDate = format(day, "yyyy-MM-dd");
          const isInCurrentMonth = isSameMonth(day, monthStart);
          const reportSummary = reportedDaysMap.get(isoDate);

          return (
            <Paper
              key={isoDate}
              variant="outlined"
              sx={{
                minHeight: 88,
                p: 1,
                borderRadius: 2,
                bgcolor: reportSummary ? "success.light" : "background.paper",
                borderColor: reportSummary ? "success.main" : "divider",
                color: reportSummary ? "success.contrastText" : "text.primary",
                opacity: isInCurrentMonth ? 1 : 0.35,
                outline: isToday(day) ? "2px solid" : "none",
                outlineColor: reportSummary ? "success.dark" : "primary.main",
              }}
            >
              <Stack spacing={0.5}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {format(day, "d")}
                </Typography>

                {reportSummary ? (
                  <>
                    <Typography variant="caption">
                      {reportSummary.reportCount} report(s)
                    </Typography>
                    <Typography variant="caption">
                      +{reportSummary.positiveCount} / -
                      {reportSummary.negativeCount}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="caption" color="inherit">
                    -
                  </Typography>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </Stack>
  );
}
