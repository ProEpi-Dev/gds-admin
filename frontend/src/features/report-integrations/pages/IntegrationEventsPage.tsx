import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  TablePagination,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  useIntegrationEvents,
  useRetryIntegration,
  useIntegrationMessages,
  useSendIntegrationMessage,
} from '../hooks/useReportIntegrations';
import { useCurrentContext } from '../../../contexts/CurrentContextContext';
import { formatDateTimeFromApi } from '../../../utils/formatDateOnlyFromApi';
import type { IntegrationEvent } from '../../../api/services/report-integrations.service';
import { filterEchoInboundMessages } from '../utils/filterEchoInboundMessages';

const STATUS_COLOR: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'warning',
  processing: 'info',
  sent: 'success',
  failed: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  sent: 'Enviado',
  failed: 'Falhou',
};

export default function IntegrationEventsPage() {
  const { currentContext } = useCurrentContext();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedEvent, setSelectedEvent] = useState<IntegrationEvent | null>(null);
  const [messageText, setMessageText] = useState('');

  const query = {
    page: page + 1,
    pageSize: rowsPerPage,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(currentContext ? { contextId: currentContext.id } : {}),
  };

  const { data, isLoading } = useIntegrationEvents(query);
  const retryMutation = useRetryIntegration();

  const {
    data: messages,
    isLoading: messagesLoading,
  } = useIntegrationMessages(selectedEvent?.id ?? null);

  const visibleMessages = useMemo(
    () => filterEchoInboundMessages(messages ?? []),
    [messages],
  );

  const sendMessageMutation = useSendIntegrationMessage();

  const handleSendMessage = () => {
    if (!selectedEvent || !messageText.trim()) return;
    sendMessageMutation.mutate(
      { eventId: selectedEvent.id, message: messageText.trim() },
      { onSuccess: () => setMessageText('') },
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Integrações de sinais
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="pending">Pendente</MenuItem>
              <MenuItem value="processing">Processando</MenuItem>
              <MenuItem value="sent">Enviado</MenuItem>
              <MenuItem value="failed">Falhou</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            {currentContext
              ? `Contexto: ${currentContext.name}`
              : 'Todos os contextos'}
          </Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Report</TableCell>
                  <TableCell>ID Externo</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ambiente</TableCell>
                  <TableCell>Tentativas</TableCell>
                  <TableCell>Último erro</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.data.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.id}</TableCell>
                    <TableCell>#{event.reportId}</TableCell>
                    <TableCell>
                      {event.externalEventId || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABEL[event.status] ?? event.status}
                        color={STATUS_COLOR[event.status] ?? 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={event.environment === 'homologation' ? 'Homologação' : 'Produção'}
                        color={event.environment === 'homologation' ? 'warning' : 'success'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{event.attemptCount}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="caption" noWrap title={event.lastError ?? ''}>
                        {event.lastError ?? '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {formatDateTimeFromApi(event.createdAt, 'pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {(event.status === 'failed' || event.status === 'pending') && (
                          <Tooltip title="Reenviar">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => retryMutation.mutate(event.id)}
                              disabled={retryMutation.isPending}
                            >
                              <RefreshIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {event.externalEventId && (
                          <Tooltip title="Ver mensagens">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedEvent(event)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Nenhuma integração encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {data?.meta && (
              <TablePagination
                component="div"
                count={data.meta.totalItems}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage="Itens por página"
              />
            )}
          </>
        )}
      </TableContainer>

      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Mensagens — Evento #{selectedEvent?.id}
        </DialogTitle>
        <DialogContent dividers>
          {messagesLoading ? (
            <CircularProgress />
          ) : (
            <>
              {visibleMessages.length === 0 && (
                <Alert severity="info">Nenhuma mensagem ainda</Alert>
              )}
              <List dense>
                {visibleMessages.map((msg, idx) => (
                  <Box key={msg.id}>
                    {idx > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={msg.body}
                        secondary={`${msg.direction === 'inbound' ? 'Recebida' : 'Enviada'}${
                          msg.author ? ` por ${msg.author}` : ''
                        } — ${formatDateTimeFromApi(msg.createdAt, 'pt-BR')}`}
                      />
                    </ListItem>
                  </Box>
                ))}
              </List>
            </>
          )}

          {selectedEvent?.externalEventId && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Enviar mensagem..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessageMutation.isPending}
              >
                <SendIcon />
              </IconButton>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
