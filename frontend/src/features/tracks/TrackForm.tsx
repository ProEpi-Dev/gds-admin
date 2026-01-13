import { useEffect, useState } from "react";
import { TrackService } from "../../api/services/track.service";
import { contentService } from "../../api/services/content.service";
import { formsService } from "../../api/services/forms.service";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Paper,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useSnackbar } from "../../hooks/useSnackbar";

export default function TrackForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: "",
    description: "",
    control_period: false,
    start_date: "",
    end_date: "",
    show_after_completion: false,
    sections: [] as Array<{
      name: string;
      order: number;
      sequences: Array<{
        content_id?: number;
        form_id?: number;
        order: number;
      }>;
    }>,
  });

  const [contents, setContents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);

  useEffect(() => {
    // Load contents and forms for selection
    contentService.findAll().then((res) => setContents(res.data));
    formsService.findAll().then((res) => setForms(res.data));
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      TrackService.get(Number(id)).then((res) => {
        const track = res.data;
        setForm({
          name: track.name,
          description: track.description || "",
          control_period: track.control_period,
          start_date: track.start_date ? track.start_date.split("T")[0] : "",
          end_date: track.end_date ? track.end_date.split("T")[0] : "",
          show_after_completion: track.show_after_completion,
          sections:
            track.section?.map((section: any) => ({
              name: section.name,
              order: section.order,
              sequences:
                section.sequence?.map((seq: any) => ({
                  content_id: seq.content_id,
                  form_id: seq.form_id,
                  order: seq.order,
                })) || [],
            })) || [],
        });
      });
    }
  }, [id, isEdit]);

  const addSection = () => {
    setForm((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          name: `Seção ${prev.sections.length + 1}`,
          order: prev.sections.length,
          sequences: [],
        },
      ],
    }));
  };

  const removeSection = (index: number) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections
        .filter((_, i) => i !== index)
        .map((section, i) => ({
          ...section,
          order: i,
        })),
    }));
  };

  const updateSectionName = (index: number, name: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { ...section, name } : section
      ),
    }));
  };

  const addSequenceToSection = (
    sectionIndex: number,
    type: "content" | "form",
    id: number
  ) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              sequences: [
                ...section.sequences,
                {
                  [type === "content" ? "content_id" : "form_id"]: id,
                  order: section.sequences.length,
                },
              ],
            }
          : section
      ),
    }));
  };

  const removeSequenceFromSection = (
    sectionIndex: number,
    sequenceIndex: number
  ) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              sequences: section.sequences
                .filter((_, j) => j !== sequenceIndex)
                .map((seq, j) => ({ ...seq, order: j })),
            }
          : section
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && id) {
        await TrackService.update(Number(id), form);
        snackbar.showSuccess("Trilha atualizada com sucesso!");
      } else {
        await TrackService.create(form);
        snackbar.showSuccess("Trilha criada com sucesso!");
      }
      navigate("/tracks");
    } catch (error) {
      snackbar.showError("Erro ao salvar trilha");
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/tracks")}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" ml={2}>
          {isEdit ? "Editar Trilha" : "Nova Trilha"}
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" mb={2}>
            Informações Gerais
          </Typography>
          <TextField
            fullWidth
            label="Nome da Trilha"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Descrição"
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.control_period}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    control_period: e.target.checked,
                  }))
                }
              />
            }
            label="Controlar Período"
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.show_after_completion}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    show_after_completion: e.target.checked,
                  }))
                }
              />
            }
            label="Mostrar Após Conclusão"
          />

          {form.control_period && (
            <Box mt={2}>
              <TextField
                fullWidth
                label="Data de Início"
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, start_date: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2, mr: 2 }}
              />
              <TextField
                fullWidth
                label="Data de Fim"
                type="date"
                value={form.end_date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, end_date: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">Seções da Trilha</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={addSection}
              variant="outlined"
            >
              Adicionar Seção
            </Button>
          </Box>

          {form.sections.map((section, sectionIndex) => (
            <Accordion key={sectionIndex} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{section.name}</Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSection(sectionIndex);
                  }}
                  sx={{ ml: "auto" }}
                >
                  <DeleteIcon />
                </IconButton>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  fullWidth
                  label="Nome da Seção"
                  value={section.name}
                  onChange={(e) =>
                    updateSectionName(sectionIndex, e.target.value)
                  }
                  sx={{ mb: 2 }}
                />

                <Typography variant="subtitle1" mb={1}>
                  Conteúdos e Quizzes
                </Typography>

                <List>
                  {section.sequences.map((sequence, seqIndex) => {
                    const content = contents.find(
                      (c) => c.id === sequence.content_id
                    );
                    const formItem = forms.find(
                      (f) => f.id === sequence.form_id
                    );
                    const item = content || formItem;
                    const type = content ? "Conteúdo" : "Quiz";

                    return (
                      <ListItem key={seqIndex}>
                        <ListItemText
                          primary={
                            item?.title || item?.name || `Item ${seqIndex + 1}`
                          }
                          secondary={type}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            onClick={() =>
                              removeSequenceFromSection(sectionIndex, seqIndex)
                            }
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>

                <Box display="flex" gap={2} mt={2}>
                  <FormControl fullWidth>
                    <InputLabel>Adicionar Conteúdo</InputLabel>
                    <Select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addSequenceToSection(
                            sectionIndex,
                            "content",
                            Number(e.target.value)
                          );
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>Selecione um conteúdo</em>
                      </MenuItem>
                      {contents.map((content) => (
                        <MenuItem key={content.id} value={content.id}>
                          {content.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Adicionar Quiz</InputLabel>
                    <Select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addSequenceToSection(
                            sectionIndex,
                            "form",
                            Number(e.target.value)
                          );
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>Selecione um quiz</em>
                      </MenuItem>
                      {forms
                        .filter((f) => f.type === "quiz")
                        .map((formItem) => (
                          <MenuItem key={formItem.id} value={formItem.id}>
                            {formItem.title}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>

        <Box display="flex" gap={2}>
          <Button type="submit" variant="contained">
            {isEdit ? "Atualizar" : "Criar"} Trilha
          </Button>
          <Button onClick={() => navigate("/tracks")} variant="outlined">
            Cancelar
          </Button>
        </Box>
      </form>
    </Box>
  );
}
