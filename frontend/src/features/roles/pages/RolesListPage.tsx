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
  Chip,
} from "@mui/material";
import { AdminPanelSettings as RoleIcon } from "@mui/icons-material";
import { useRoles } from "../hooks/useRoles";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorAlert from "../../../components/common/ErrorAlert";

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  context: "Contexto",
};

const SCOPE_COLORS: Record<string, "primary" | "secondary"> = {
  global: "primary",
  context: "secondary",
};

const ROLE_COLOR: Record<string, "warning" | "info" | "success" | "default"> =
  {
    admin: "warning",
    manager: "info",
    content_manager: "success",
    participant: "default",
  };

export default function RolesListPage() {
  const { data: roles, isLoading, error } = useRoles();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message="Erro ao carregar papéis." />;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <RoleIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h4">Papéis</Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Os papéis definem o nível de acesso de cada participante no sistema.
        Papéis de escopo <strong>Global</strong> se aplicam a todo o sistema;
        papéis de escopo <strong>Contexto</strong> se aplicam dentro de um
        contexto específico.
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Papel</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Escopo</TableCell>
              <TableCell>Descrição</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles?.map((role) => (
              <TableRow key={role.id} hover>
                <TableCell>
                  <Chip
                    label={role.name}
                    color={ROLE_COLOR[role.code] ?? "default"}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: "monospace", color: "text.secondary" }}
                  >
                    {role.code}
                  </Typography>
                </TableCell>
                <TableCell>
                  {role.scope && (
                    <Chip
                      label={SCOPE_LABELS[role.scope] ?? role.scope}
                      color={SCOPE_COLORS[role.scope] ?? "default"}
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {role.description ?? "—"}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
