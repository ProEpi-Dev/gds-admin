import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { rolesService } from "../../../api/services/roles.service";
import { useRoles } from "../hooks/useRoles";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { getErrorMessage } from "../../../utils/errorHandler";
import type { Permission } from "../../../types/permission.types";

function permissionGroupKey(code: string): string {
  const i = code.indexOf(":");
  return i === -1 ? code : code.slice(0, i);
}

export default function RolePermissionsPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const queryClient = useQueryClient();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const [roleId, setRoleId] = useState<number | "">("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: allPermissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ["permissions", "all"],
    queryFn: () => rolesService.findAllPermissions(),
  });

  const numericRoleId = roleId === "" ? null : roleId;

  const { data: rolePermissions = [], isLoading: rolePermsLoading } = useQuery({
    queryKey: ["permissions", "role", numericRoleId],
    queryFn: () => rolesService.getRolePermissions(numericRoleId!),
    enabled: numericRoleId != null,
  });

  useEffect(() => {
    if (numericRoleId == null) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(rolePermissions.map((p) => p.id)));
  }, [numericRoleId, rolePermissions]);

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of allPermissions) {
      const g = permissionGroupKey(p.code);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  const mutation = useMutation({
    mutationFn: ({
      id,
      ids,
    }: {
      id: number;
      ids: number[];
    }) => rolesService.setRolePermissions(id, ids),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["permissions", "role", variables.id],
      });
      snackbar.showSuccess("Permissões do papel atualizadas.");
    },
    onError: (err) => {
      snackbar.showError(
        getErrorMessage(err, "Não foi possível salvar as permissões."),
      );
    },
  });

  const selectedRole = roles?.find((r) => r.id === numericRoleId);
  const dirty =
    numericRoleId != null &&
    (() => {
      const a = [...selectedIds].sort((x, y) => x - y);
      const b = rolePermissions.map((p) => p.id).sort((x, y) => x - y);
      if (a.length !== b.length) return true;
      return a.some((v, i) => v !== b[i]);
    })();

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (numericRoleId == null) return;
    mutation.mutate({
      id: numericRoleId,
      ids: [...selectedIds],
    });
  };

  const loading =
    rolesLoading || permsLoading || (numericRoleId != null && rolePermsLoading);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/roles")}
          size="small"
        >
          Papéis
        </Button>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <Typography variant="h4">Permissões por papel</Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Escolha um papel de <strong>escopo contexto</strong> (ex.: gerente,
        gerente de conteúdo, participante) e marque as permissões que usuários
        com esse papel recebem em cada contexto. Alterações afetam novas
        checagens de API; quem já está logado pode precisar entrar de novo.
      </Typography>

      <Alert severity="warning" sx={{ mb: 2 }}>
        Papéis globais (ex.: administrador) não usam esta matriz da mesma
        forma. Tenha cuidado ao reduzir permissões de papéis em uso.
      </Alert>

      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControl fullWidth size="small" sx={{ maxWidth: 400, mb: 2 }}>
          <InputLabel id="role-perm-role-label">Papel</InputLabel>
          <Select
            labelId="role-perm-role-label"
            label="Papel"
            value={roleId === "" ? "" : String(roleId)}
            onChange={(e) => {
              const v = e.target.value;
              setRoleId(v === "" ? "" : Number(v));
            }}
          >
            <MenuItem value="">
              <em>Selecione um papel</em>
            </MenuItem>
            {roles?.map((r) => (
              <MenuItem key={r.id} value={String(r.id)}>
                {`${r.name} (${r.code})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {numericRoleId != null && selectedRole && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Escopo:{" "}
            <strong>{selectedRole.scope ?? "—"}</strong> · Código:{" "}
            <Box component="span" sx={{ fontFamily: "monospace" }}>
              {selectedRole.code}
            </Box>
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Button
            variant="contained"
            startIcon={
              mutation.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            disabled={
              numericRoleId == null || !dirty || mutation.isPending || loading
            }
            onClick={handleSave}
          >
            Salvar permissões
          </Button>
          {numericRoleId != null && dirty && (
            <Typography variant="caption" color="warning.main">
              Há alterações não salvas
            </Typography>
          )}
        </Box>
      </Paper>

      {loading && numericRoleId != null ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : numericRoleId == null ? (
        <Typography color="text.secondary">
          Selecione um papel para editar as permissões.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
          }}
        >
          {grouped.map(([group, items]) => (
            <Paper key={group} variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {group}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <FormGroup>
                {items.map((p) => (
                  <FormControlLabel
                    key={p.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" component="span">
                          {p.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {p.code}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}
