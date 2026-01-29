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
        label: "Artigo: Introdução à Plataforma",
        type: "content",
        users: {
          Ana: "10/01/2026",
          Bruno: "11/01/2026",
          Carlos: "-",
        },
      },
      {
        label: "Quiz: Conhecimentos Básicos",
        type: "quiz",
        users: {
          Ana: "12/01/2026",
          Bruno: "-",
          Carlos: "13/01/2026",
        },
      },
    ],
  },
  {
    id: 2,
    name: "Trilha de Segurança",
    executions: [
      {
        label: "Artigo: Boas Práticas",
        type: "content",
        users: {
          Ana: "15/01/2026",
          Bruno: "16/01/2026",
        },
      },
    ],
  },
];

export default function TrackExecutionRegistry() {
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
              <Typography variant="h6">{track.name}</Typography>
            </AccordionSummary>

            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Atividade</strong>
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
