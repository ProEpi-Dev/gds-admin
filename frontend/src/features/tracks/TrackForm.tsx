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
  Stack,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIndicatorIcon,
} from "@mui/icons-material";
import { useSnackbar } from "../../hooks/useSnackbar";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableSection({
  section,
  sectionIndex,
  updateSectionName,
  removeSection,
  addSequenceToSection,
  removeSequenceFromSection,
  contents,
  forms,
  children,
}: {
  section: any;
  sectionIndex: number;
  updateSectionName: (index: number, name: string) => void;
  removeSection: (index: number) => void;
  addSequenceToSection: (sectionIndex: number, type: "content" | "form", id: number) => void;
  removeSequenceFromSection: (sectionIndex: number, sequenceIndex: number) => void;
  contents: any[];
  forms: any[];
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `section-${sectionIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Accordion ref={setNodeRef} style={style} sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" width="100%">
          <IconButton {...attributes} {...listeners} size="small" sx={{ mr: 1 }}>
            <DragIndicatorIcon />
          </IconButton>
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
        </Box>
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

        {children}

        <Stack direction="row" spacing={2} mt={2} alignItems="center">
          <FormControl fullWidth>
            <InputLabel id="add-content-label">
              Adicionar Conteúdo
            </InputLabel>

            <Select
              labelId="add-content-label"
              label="Adicionar Conteúdo"
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
            <InputLabel id="add-quiz-label">Adicionar Quiz</InputLabel>

            <Select
              labelId="add-quiz-label"
              label="Adicionar Quiz"
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

              {forms.map((form) => (
                <MenuItem key={form.id} value={form.id}>
                  {form.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function SortableSequence({
  sequence,
  seqIndex,
  removeSequenceFromSection,
  sectionIndex,
  contents,
  forms,
}: {
  sequence: any;
  seqIndex: number;
  removeSequenceFromSection: (sectionIndex: number, sequenceIndex: number) => void;
  sectionIndex: number;
  contents: any[];
  forms: any[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `sequence-${sectionIndex}-${seqIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const content = contents.find((c) => c.id === sequence.content_id);
  const formItem = forms.find((f) => f.id === sequence.form_id);
  const item = content || formItem;
  const type = content ? "Conteúdo" : "Quiz";

  return (
    <ListItem ref={setNodeRef} style={style}>
      <IconButton {...attributes} {...listeners} size="small" sx={{ mr: 1 }}>
        <DragIndicatorIcon />
      </IconButton>
      <ListItemText
        primary={item?.title || item?.name || `Item ${seqIndex + 1}`}
        secondary={type}
      />
      <ListItemSecondaryAction>
        <IconButton
          onClick={() => removeSequenceFromSection(sectionIndex, seqIndex)}
        >
          <DeleteIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default function TrackForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const isEdit = !!id;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [form, setForm] = useState({
    name: "",
    description: "",
    control_period: false,
    start_date: "",
    end_date: "",
    show_after_completion: false,
    sections: [] as Array<{
      id?: number;
      name: string;
      order: number;
      sequences: Array<{
        id?: number;
        content_id?: number;
        form_id?: number;
        order: number;
      }>;
    }>,
  });

  const [contents, setContents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Handle section reordering
    if (activeId.startsWith("section-") && overId.startsWith("section-")) {
      const oldIndex = parseInt(activeId.split("-")[1]);
      const newIndex = parseInt(overId.split("-")[1]);

      setForm((prev) => {
        const newSections = arrayMove(prev.sections, oldIndex, newIndex).map(
          (section, index) => ({ ...section, order: index })
        );

        // Update backend
        if (isEdit && id) {
          TrackService.reorderSections(
            Number(id),
            newSections.map((s) => ({ id: s.id!, order: s.order }))
          ).catch((error) => {
            snackbar.showError("Erro ao reordenar seções");
            console.error(error);
          });
        }

        return { ...prev, sections: newSections };
      });
    }

    // Handle sequence reordering within a section
    if (activeId.startsWith("sequence-") && overId.startsWith("sequence-")) {
      const [activeSectionIndex, activeSeqIndex] = activeId.split("-").slice(1).map(Number);
      const [overSectionIndex, overSeqIndex] = overId.split("-").slice(1).map(Number);

      // Only allow reordering within the same section
      if (activeSectionIndex === overSectionIndex) {
        setForm((prev) => {
          const section = prev.sections[activeSectionIndex];
          const newSequences = arrayMove(section.sequences, activeSeqIndex, overSeqIndex).map(
            (seq, index) => ({ ...seq, order: index })
          );

          const newSections = [...prev.sections];
          newSections[activeSectionIndex] = { ...section, sequences: newSequences };

          // Update backend
          if (isEdit && id && section.id) {
            TrackService.reorderSequences(
              Number(id),
              section.id,
              newSequences.map((s) => ({ id: s.id!, order: s.order }))
            ).catch((error) => {
              snackbar.showError("Erro ao reordenar sequências");
              console.error(error);
            });
          }

          return { ...prev, sections: newSections };
        });
      }
    }
  };

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
              id: section.id,
              name: section.name,
              order: section.order,
              sequences:
                section.sequence?.map((seq: any) => ({
                  id: seq.id,
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
          <Box display="flex" gap={2} mb={2} alignItems="center">
            <FormControlLabel
              sx={{ m: 0 }}
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
            />

            <FormControlLabel
              sx={{ m: 0 }}
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
          </Box>

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

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={form.sections.map((_, index) => `section-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              {form.sections.map((section, sectionIndex) => (
                <SortableSection
                  key={`section-${sectionIndex}`}
                  section={section}
                  sectionIndex={sectionIndex}
                  updateSectionName={updateSectionName}
                  removeSection={removeSection}
                  addSequenceToSection={addSequenceToSection}
                  removeSequenceFromSection={removeSequenceFromSection}
                  contents={contents}
                  forms={forms}
                >
                  <SortableContext
                    items={section.sequences.map((_, seqIndex) => `sequence-${sectionIndex}-${seqIndex}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <List>
                      {section.sequences.map((sequence, seqIndex) => (
                        <SortableSequence
                          key={`sequence-${sectionIndex}-${seqIndex}`}
                          sequence={sequence}
                          seqIndex={seqIndex}
                          removeSequenceFromSection={removeSequenceFromSection}
                          sectionIndex={sectionIndex}
                          contents={contents}
                          forms={forms}
                        />
                      ))}
                    </List>
                  </SortableContext>
                </SortableSection>
              ))}
            </SortableContext>
          </DndContext>
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
