import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, PersonOff as PersonOffIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAdmins, usePromoteToAdmin, useRemoveAdmin, useCreateAdmin } from '../hooks/useAdmins';
import { useRoles } from '../../roles/hooks/useRoles';
import { useAuth } from '../../../contexts/AuthContext';
import SelectUser from '../../../components/common/SelectUser';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { getErrorMessage } from '../../../utils/errorHandler';
import type { User } from '../../../types/user.types';

type AddAdminTab = 'existing' | 'new';

const initialNewAdminForm = { name: '', email: '', password: '' };

export default function AdminsListPage() {
  const { user: currentUser } = useAuth();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addTab, setAddTab] = useState<AddAdminTab>('existing');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newAdminForm, setNewAdminForm] = useState(initialNewAdminForm);
  const [showPassword, setShowPassword] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);

  const { data: adminsResponse, isLoading, error } = useAdmins({ pageSize: 100 });
  const { data: roles } = useRoles();
  const promoteMutation = usePromoteToAdmin();
  const createAdminMutation = useCreateAdmin();
  const removeMutation = useRemoveAdmin();

  const admins = adminsResponse?.data ?? [];
  const adminRoleId = roles?.find((r) => r.code === 'admin')?.id;
  const adminIds = admins.map((a) => a.id);

  const handleOpenAdd = () => {
    setSelectedUserId(null);
    setNewAdminForm(initialNewAdminForm);
    setAddTab('existing');
    setAddDialogOpen(true);
  };

  const handlePromote = () => {
    if (!selectedUserId || !adminRoleId) return;
    promoteMutation.mutate(
      { userId: selectedUserId, roleId: adminRoleId },
      {
        onSuccess: () => {
          setAddDialogOpen(false);
          setSelectedUserId(null);
        },
      },
    );
  };

  const handleCreateAdmin = () => {
    if (!adminRoleId || !newAdminForm.name.trim() || !newAdminForm.email.trim() || !newAdminForm.password) return;
    createAdminMutation.mutate(
      {
        name: newAdminForm.name.trim(),
        email: newAdminForm.email.trim(),
        password: newAdminForm.password,
        roleId: adminRoleId,
      },
      {
        onSuccess: () => {
          setAddDialogOpen(false);
          setNewAdminForm(initialNewAdminForm);
        },
      },
    );
  };

  const canSubmitNew =
    adminRoleId &&
    newAdminForm.name.trim() &&
    newAdminForm.email.trim() &&
    newAdminForm.password.length >= 6;

  const handleOpenRemove = (user: User) => {
    setUserToRemove(user);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = () => {
    if (!userToRemove) return;
    removeMutation.mutate(userToRemove.id, {
      onSuccess: () => {
        setRemoveDialogOpen(false);
        setUserToRemove(null);
      },
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message="Erro ao carregar administradores." />;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4">Administradores</Typography>
          <Typography variant="body2" color="text.secondary">
            Apenas administradores podem ser definidos aqui. Gerentes e participantes são
            gerenciados por participação em cada contexto.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          disabled={!adminRoleId}
        >
          Adicionar administrador
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    Nenhum administrador cadastrado.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.id} hover>
                  <TableCell>{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      title="Remover administração"
                      disabled={currentUser?.id === admin.id}
                      onClick={() => handleOpenRemove(admin)}
                    >
                      <PersonOffIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar administrador</DialogTitle>
        <DialogContent>
          <Tabs value={addTab} onChange={(_, v) => setAddTab(v as AddAdminTab)} sx={{ mb: 2 }}>
            <Tab label="Usuário existente" value="existing" />
            <Tab label="Novo usuário" value="new" />
          </Tabs>

          {addTab === 'existing' && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Selecione um usuário para conceder acesso de administrador ao sistema.
              </Typography>
              <SelectUser
                value={selectedUserId}
                onChange={setSelectedUserId}
                label="Usuário"
                excludeIds={adminIds}
              />
            </>
          )}

          {addTab === 'new' && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Crie um novo usuário que será apenas administrador (sem participações em contextos).
              </Typography>
              <TextField
                fullWidth
                label="Nome"
                value={newAdminForm.name}
                onChange={(e) => setNewAdminForm((p) => ({ ...p, name: e.target.value }))}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="E-mail"
                type="email"
                value={newAdminForm.email}
                onChange={(e) => setNewAdminForm((p) => ({ ...p, email: e.target.value }))}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={newAdminForm.password}
                onChange={(e) => setNewAdminForm((p) => ({ ...p, password: e.target.value }))}
                margin="normal"
                required
                helperText="Mínimo 6 caracteres"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((p) => !p)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}

          {(promoteMutation.isError || createAdminMutation.isError) && (
            <Box sx={{ mt: 2 }}>
              <ErrorAlert
                message={getErrorMessage(promoteMutation.error ?? createAdminMutation.error)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
          {addTab === 'existing' ? (
            <Button
              variant="contained"
              onClick={handlePromote}
              disabled={!selectedUserId || promoteMutation.isPending}
            >
              {promoteMutation.isPending ? 'Salvando…' : 'Conceder administração'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleCreateAdmin}
              disabled={!canSubmitNew || createAdminMutation.isPending}
            >
              {createAdminMutation.isPending ? 'Criando…' : 'Criar e conceder administração'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={removeDialogOpen}
        title="Remover administração"
        message={
          userToRemove
            ? `Remover o acesso de administrador de "${userToRemove.name}" (${userToRemove.email})? O usuário continuará no sistema e poderá ter participações em contextos.`
            : ''
        }
        confirmText="Remover administração"
        cancelText="Cancelar"
        onConfirm={handleConfirmRemove}
        onCancel={() => {
          setRemoveDialogOpen(false);
          setUserToRemove(null);
        }}
        loading={removeMutation.isPending}
      />

      {removeMutation.isError && (
        <Box sx={{ mt: 2 }}>
          <ErrorAlert
            message={getErrorMessage(removeMutation.error)}
            onClose={() => removeMutation.reset()}
          />
        </Box>
      )}
    </Box>
  );
}
