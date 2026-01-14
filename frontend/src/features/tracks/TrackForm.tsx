import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
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
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableSection({
  section,
  sectionIndex,
  updateSectionName,
  removeSection,
  addSequenceToSection,
  contents,
  forms,
  children,
}: {
  section: any;
  sectionIndex: number;
  updateSectionName: (index: number, name: string) => void;
  removeSection: (index: number) => void;
  addSequenceToSection: (
    sectionIndex: number,
    type: "content" | "form",
    id: number
  ) => void;
  removeSequenceFromSection: (
    sectionIndex: number,
    sequenceIndex: number
  ) => void;
  contents: any[];
  forms: any[];
  children: React.ReactNode;
}) {
  const sortableSectionId = section.id
    ? `section-${section.id}`
    : `section-temp-${section.tempId}`;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: sortableSectionId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Accordion ref={setNodeRef} style={style} sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" width="100%">
          <Box
            {...attributes}
            {...listeners}
            sx={{
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              mr: 1,
              p: 0.5,
              borderRadius: 1,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <DragIndicatorIcon />
          </Box>
          <Typography>{section.name}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">Configurações da Seção</Typography>
          <IconButton
            size="small"
            onClick={() => removeSection(sectionIndex)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
        <TextField
          fullWidth
          label="Nome da Seção"
          value={section.name}
          onChange={(e) => updateSectionName(sectionIndex, e.target.value)}
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle1" mb={1}>
          Conteúdos e Quizzes
        </Typography>

        {children}

        <Box mt={2}>
          <Typography variant="subtitle2" mb={1}>
            Adicionar Item à Seção
          </Typography>
          <FormControl fullWidth>
            <InputLabel id={`add-item-label-${sectionIndex}`}>
              Selecionar Item
            </InputLabel>
            <Select
              labelId={`add-item-label-${sectionIndex}`}
              label="Selecionar Item"
              value=""
              onChange={(e) => {
                const [type, id] = (e.target.value as string).split("-");
                if (type && id) {
                  addSequenceToSection(
                    sectionIndex,
                    type as "content" | "form",
                    Number(id)
                  );
                }
              }}
            >
              <MenuItem value="" disabled>
                <em>Selecione um item</em>
              </MenuItem>
              <MenuItem
                disabled
                sx={{ fontWeight: "bold", color: "primary.main" }}
              >
                Conteúdos Disponíveis
              </MenuItem>
              {contents.map((content) => (
                <MenuItem
                  key={`content-${content.id}`}
                  value={`content-${content.id}`}
                  sx={{ pl: 4 }}
                >
                  {content.title} (conteúdo)
                </MenuItem>
              ))}
              <MenuItem
                disabled
                sx={{ fontWeight: "bold", color: "secondary.main", mt: 1 }}
              >
                Quizzes Disponíveis
              </MenuItem>
              {forms.map((form) => (
                <MenuItem
                  key={`form-${form.id}`}
                  value={`form-${form.id}`}
                  sx={{ pl: 4 }}
                >
                  {form.title} (quiz)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
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
  removeSequenceFromSection: (
    sectionIndex: number,
    sequenceIndex: number
  ) => void;
  sectionIndex: number;
  contents: any[];
  forms: any[];
}) {
  const sortableId = sequence.id
    ? `sequence-${sequence.id}`
    : `sequence-temp-${sequence.tempId}`;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const content = contents.find((c) => c.id === sequence.content_id);
  const formItem = forms.find((f) => f.id === sequence.form_id);
  const item = content || formItem;
  const type = content ? "Conteúdo" : "Quiz";
  const typeColor = content ? "primary.main" : "secondary.main";

  return (
    <ListItem ref={setNodeRef} style={style}>
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          mr: 1,
          p: 0.5,
          borderRadius: 1,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <DragIndicatorIcon />
      </Box>
      <ListItemText
        primary={item?.title || item?.name || `Item ${seqIndex + 1}`}
        secondary={
          <Typography variant="caption" color={typeColor}>
            {type}
          </Typography>
        }
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
      tempId?: string;
      name: string;
      order: number;
      sequences: Array<{
        id?: number;
        tempId?: string;
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
      setForm((prev) => {
        const oldIndex = prev.sections.findIndex(
          (section) =>
            (section.id
              ? `section-${section.id}`
              : `section-temp-${section.tempId}`) === activeId
        );

        const newIndex = prev.sections.findIndex(
          (section) =>
            (section.id
              ? `section-${section.id}`
              : `section-temp-${section.tempId}`) === overId
        );

        if (oldIndex === -1 || newIndex === -1) return prev;

        const newSections = arrayMove(prev.sections, oldIndex, newIndex).map(
          (section, index) => ({ ...section, order: index })
        );

        return { ...prev, sections: newSections };
      });
    }

    // Handle sequence reordering within a section
    if (activeId.startsWith("sequence-") && overId.startsWith("sequence-")) {
      const findSequencePosition = (id: string) => {
        for (let sIndex = 0; sIndex < form.sections.length; sIndex++) {
          const seqIndex = form.sections[sIndex].sequences.findIndex(
            (seq, i) => {
              const seqId = seq.id
                ? `sequence-${seq.id}`
                : `sequence-temp-${sIndex}-${i}`;
              return seqId === id;
            }
          );

          if (seqIndex !== -1) {
            return { sectionIndex: sIndex, seqIndex };
          }
        }
        return null;
      };

      const activePos = findSequencePosition(activeId);
      const overPos = findSequencePosition(overId);

      if (
        !activePos ||
        !overPos ||
        activePos.sectionIndex !== overPos.sectionIndex
      ) {
        return;
      }

      const { sectionIndex, seqIndex: oldIndex } = activePos;
      const { seqIndex: newIndex } = overPos;

      setForm((prev) => {
        const section = prev.sections[sectionIndex];

        const newSequences = arrayMove(
          section.sequences,
          oldIndex,
          newIndex
        ).map((seq, index) => ({ ...seq, order: index }));

        const newSections = [...prev.sections];
        newSections[sectionIndex] = {
          ...section,
          sequences: newSequences,
        };

        if (isEdit && id && section.id) {
          TrackService.reorderSequences(
            Number(id),
            section.id,
            newSequences
              .filter((s) => s.id) // só as salvas
              .map((s) => ({ id: s.id!, order: s.order }))
          ).catch(() => {
            snackbar.showError("Erro ao reordenar sequências");
          });
        }

        return { ...prev, sections: newSections };
      });
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
          tempId: nanoid(), // 👈 ID FIXO
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
                  tempId: nanoid(),
                  [type === "content" ? "content_id" : "form_id"]: id,
                  order: section.sequences.length,
                },
              ],
            }
          : section
      ),
    }));
  };

  const removeSequenceFromSection = async (
    sectionIndex: number,
    sequenceIndex: number
  ) => {
    const section = form.sections[sectionIndex];
    const sequence = section.sequences[sequenceIndex];

    if (isEdit && id && section.id && sequence?.id) {
      try {
        // Usar content_id se existir, senão usar o id da sequence
        const contentId = sequence.content_id || sequence.id;
        await TrackService.removeSequence(Number(id), section.id, contentId);

        snackbar.showSuccess("Item removido com sucesso");
      } catch (error) {
        snackbar.showError("Erro ao remover item");
        return;
      }
    }

    // Atualização otimista
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex
          ? {
              ...s,
              sequences: s.sequences
                .filter((_, j) => j !== sequenceIndex)
                .map((seq, j) => ({ ...seq, order: j })),
            }
          : s
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
              items={form.sections.map((section) =>
                section.id
                  ? `section-${section.id}`
                  : `section-temp-${section.tempId}`
              )}
              strategy={verticalListSortingStrategy}
            >
              {form.sections.map((section, sectionIndex) => {
                const sectionKey = section.id
                  ? `section-${section.id}`
                  : `section-temp-${section.tempId}`;

                return (
                  <SortableSection
                    key={sectionKey}
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
                      items={section.sequences.map((seq) =>
                        seq.id
                          ? `sequence-${seq.id}`
                          : `sequence-temp-${seq.tempId}`
                      )}
                      strategy={verticalListSortingStrategy}
                    >
                      <List>
                        {section.sequences.map((sequence, seqIndex) => {
                          const sortableId = sequence.id
                            ? `sequence-${sequence.id}`
                            : `sequence-temp-${sequence.tempId}`;

                          return (
                            <SortableSequence
                              key={sortableId}
                              sequence={sequence}
                              seqIndex={seqIndex}
                              removeSequenceFromSection={
                                removeSequenceFromSection
                              }
                              sectionIndex={sectionIndex}
                              contents={contents}
                              forms={forms}
                            />
                          );
                        })}
                      </List>
                    </SortableContext>
                  </SortableSection>
                );
              })}
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
