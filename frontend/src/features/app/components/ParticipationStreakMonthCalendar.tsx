import { useMemo } from "react";
import {
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export interface ParticipationStreakMonthCalendarProps {
  month: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** Datas `yyyy-MM-dd` em que houve registro no período. */
  reportedDaySet: Set<string>;
  isLoading: boolean;
}

/**
 * Calendário mensal de dias com registro (mesmo visual da guia Dias / autorrelato:
 * destaque laranja, sem legenda extra).
 */
export default function ParticipationStreakMonthCalendar({
  month,
  onPrevMonth,
  onNextMonth,
  reportedDaySet,
  isLoading,
}: ParticipationStreakMonthCalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

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

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <IconButton onClick={onPrevMonth} aria-label="Mês anterior">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" textTransform="capitalize">
          {format(month, "MMMM yyyy", { locale: ptBR })}
        </Typography>
        <IconButton onClick={onNextMonth} aria-label="Próximo mês">
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
          {WEEKDAY_LABELS.map((label, index) => (
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
            const inMonth = isSameMonth(day, month);
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
    </>
  );
}
