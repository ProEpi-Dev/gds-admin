import { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
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
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import { useContentQuizzes, useCreateContentQuiz, useUpdateContentQuiz, useDeleteContentQuiz } from '../hooks/useContentQuiz';
import { useForms } from '../../forms/hooks/useForms';
import { useSnackbar } from '../../../hooks/useSnackbar';
import type { ContentQuiz, CreateContentQuizDto, UpdateContentQuizDto } from '../../../types/content-quiz.types';

interface ContentQuizManagerProps {
  contentId: number;
}

export default function ContentQuizManager({ contentId }: ContentQuizManagerProps) {
  const snackbar = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<ContentQuiz | null>(null);
  const [formData, setFormData] = useState<CreateContentQuizDto | UpdateContentQuizDto>({
    contentId,
    formId: 0,
    displayOrder: 0,
    isRequired: false,
    weight: 1.0,
  });

  // Buscar quizes associados ao conteúdo
  const { data: contentQuizzesData, isLoading } = useContentQuizzes({
    contentId,
    page: 1,
    pageSize: 100,
  });

  // Buscar todos os quizes disponíveis
  const { data: formsData } = useForms({
    type: 'quiz',
    active: true,
    page: 1,
    pageSize: 100,
  });

  const createMutation = useCreateContentQuiz();
  const updateMutation = useUpdateContentQuiz();
  const deleteMutation = useDeleteContentQuiz();

  const contentQuizzes = contentQuizzesData?.data || [];
  const availableQuizes = formsData?.data || [];

  // Filtrar quizes já associados
  const availableQuizesToAdd = availableQuizes.filter(
    (quiz) => !contentQuizzes.some((cq) => cq.formId === quiz.id)
  );

  const handleOpenDialog = (quiz?: ContentQuiz) => {
    if (quiz) {
      setEditingQuiz(quiz);
      setFormData({
        displayOrder: quiz.displayOrder,
        isRequired: quiz.isRequired,
        weight: quiz.weight,
      });
    } else {
      setEditingQuiz(null);
      setFormData({
        contentId,
        formId: 0,
        displayOrder: contentQuizzes.length,
        isRequired: false,
        weight: 1.0,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingQuiz(null);
  };

  const handleSubmit = () => {
    if (editingQuiz) {
      // Atualizar
      updateMutation.mutate(
        { id: editingQuiz.id, data: formData as UpdateContentQuizDto },
        {
          onSuccess: () => {
            snackbar.showSuccess('Quiz atualizado com sucesso');
            handleCloseDialog();
          },
          onError: (error: any) => {
            snackbar.showError(error?.response?.data?.message || 'Erro ao atualizar quiz');
          },
        }
      );
    } else {
      // Criar
      const createData = formData as CreateContentQuizDto;
      if (!createData.formId || createData.formId === 0) {
        snackbar.showError('Selecione um quiz');
        return;
      }

      createMutation.mutate(createData, {
        onSuccess: () => {
          snackbar.showSuccess('Quiz associado com sucesso');
          handleCloseDialog();
        },
        onError: (error: any) => {
          snackbar.showError(error?.response?.data?.message || 'Erro ao associar quiz');
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja remover esta associação?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          snackbar.showSuccess('Associação removida com sucesso');
        },
        onError: (error: any) => {
          snackbar.showError(error?.response?.data?.message || 'Erro ao remover associação');
        },
      });
    }
  };

  const handleMoveOrder = async (quiz: ContentQuiz, direction: 'up' | 'down') => {
    const sortedQuizzes = [...contentQuizzes].sort((a, b) => a.displayOrder - b.displayOrder);
    const currentIndex = sortedQuizzes.findIndex((cq) => cq.id === quiz.id);

    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sortedQuizzes.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetQuiz = sortedQuizzes[targetIndex];

    // Trocar ordens
    const newOrder = targetQuiz.displayOrder;
    const oldOrder = quiz.displayOrder;

    await Promise.all([
      updateMutation.mutateAsync({
        id: quiz.id,
        data: { displayOrder: newOrder },
      }),
      updateMutation.mutateAsync({
        id: targetQuiz.id,
        data: { displayOrder: oldOrder },
      }),
    ]);

    snackbar.showSuccess('Ordem atualizada com sucesso');
  };

  if (isLoading) {
    return <Typography>Carregando...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Quizes Associados</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={availableQuizesToAdd.length === 0}
        >
          Associar Quiz
        </Button>
      </Box>

      {availableQuizesToAdd.length === 0 && contentQuizzes.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Nenhum quiz disponível. Crie um quiz primeiro na seção de Formulários.
        </Alert>
      )}

      {contentQuizzes.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Nenhum quiz associado a este conteúdo
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ordem</TableCell>
                <TableCell>Quiz</TableCell>
                <TableCell>Obrigatório</TableCell>
                <TableCell>Peso</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...contentQuizzes]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((quiz, index) => (
                  <TableRow key={quiz.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveOrder(quiz, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <Typography>{quiz.displayOrder}</Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveOrder(quiz, 'down')}
                          disabled={index === contentQuizzes.length - 1}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {quiz.form?.title || `Quiz #${quiz.formId}`}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={quiz.isRequired ? 'Sim' : 'Não'}
                        color={quiz.isRequired ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{quiz.weight}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(quiz)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(quiz.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingQuiz ? 'Editar Associação' : 'Associar Quiz'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {!editingQuiz && (
              <TextField
                select
                label="Quiz"
                fullWidth
                value={(formData as CreateContentQuizDto).formId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, formId: Number(e.target.value) } as CreateContentQuizDto)
                }
                SelectProps={{
                  native: true,
                }}
              >
                <option value="">Selecione um quiz</option>
                {availableQuizesToAdd.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </TextField>
            )}

            <TextField
              type="number"
              label="Ordem de Exibição"
              fullWidth
              value={formData.displayOrder || 0}
              onChange={(e) =>
                setFormData({ ...formData, displayOrder: Number(e.target.value) })
              }
              inputProps={{ min: 0 }}
            />

            <TextField
              type="number"
              label="Peso"
              fullWidth
              value={formData.weight || 1.0}
              onChange={(e) =>
                setFormData({ ...formData, weight: Number(e.target.value) })
              }
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              helperText="Peso usado para cálculo de nota final (0-100)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isRequired || false}
                  onChange={(e) =>
                    setFormData({ ...formData, isRequired: e.target.checked })
                  }
                />
              }
              label="Quiz obrigatório"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              createMutation.isPending ||
              updateMutation.isPending ||
              (!editingQuiz && (!(formData as CreateContentQuizDto).formId || (formData as CreateContentQuizDto).formId === 0))
            }
          >
            {editingQuiz ? 'Atualizar' : 'Associar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

