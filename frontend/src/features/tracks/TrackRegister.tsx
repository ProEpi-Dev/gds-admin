import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

type ExecutionRow = {
  label: string;
  type: "content" | "quiz";
  users: Record<string, string>;
};

type TrackExecution = {
  id: number;
  name: string;
  executions: ExecutionRow[];
};

// Mock de dados (frontend only)
const mockTracks: TrackExecution[] = [
  {
    id: 1,
    name: "Trilha de Onboarding",
    executions: [
      {
        label: "Introdução à Plataforma",
        type: "content",
        users: {
          "202600001": "10/01/2026",
          "202600002": "11/01/2026",
          "202600003": "-",
        },
      },
      {
        label: "Conhecimentos Básicos",
        type: "quiz",
        users: {
          "202600001": "12/01/2026",
          "202600002": "-",
          "202600003": "13/01/2026",
        },
      },
    ],
  },
];

export default function TrackExecutionRegistry() {
  const handleExportCSV = (track: TrackExecution) => {
    const users = Array.from(
      new Set(track.executions.flatMap((e) => Object.keys(e.users))),
    );

    const headers = ["Atividade", "Tipo", ...users];

    const rows = track.executions.map((exec) => [
      exec.label,
      exec.type === "content" ? "Conteúdo" : "Quiz",
      ...users.map((user) => exec.users[user] || "-"),
    ]);

    const csvContent = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(";"),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";"),
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const date = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `trilha_${track.name.replace(/\s+/g, "_")}_${date}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box p={4}>
      <Typography variant="h4" mb={3}>
        Registro de Execução das Trilhas
      </Typography>

      {mockTracks.map((track) => {
        const users = Array.from(
          new Set(track.executions.flatMap((e) => Object.keys(e.users))),
        );

        return (
          <Accordion key={track.id} defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  pr: 2,
                }}
              >
                <Typography variant="h6">{track.name}</Typography>

                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportCSV(track);
                  }}
                >
                  Exportar CSV
                </Button>
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Atividade</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Tipo</strong>
                      </TableCell>
                      {users.map((user) => (
                        <TableCell key={user} align="center">
                          <strong>{user}</strong>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {track.executions.map((exec, index) => (
                      <TableRow key={index}>
                        <TableCell>{exec.label}</TableCell>

                        <TableCell align="center">
                          {exec.type === "content" ? "Conteúdo" : "Quiz"}
                        </TableCell>

                        {users.map((user) => (
                          <TableCell key={user} align="center">
                            {exec.users[user] || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
