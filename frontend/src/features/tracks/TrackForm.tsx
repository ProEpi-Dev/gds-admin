import { useEffect, useMemo, useState } from "react";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemButton,
  ClickAwayListener,
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
    id: number,
  ) => void;
  removeSequenceFromSection: (
    sectionIndex: number,
    sequence: {
      id?: number;
      tempId?: string;
    },
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
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filteredContents = useMemo(() => {
    if (!search) return contents.slice(-3).reverse();

    return contents.filter((c) =>
      c.title.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, contents]);

  const filteredForms = useMemo(() => {
    if (!search) return forms.slice(-3).reverse();

    return forms.filter((f) =>
      f.title.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, forms]);

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
          <ClickAwayListener onClickAway={() => setOpen(false)}>
            <Box mt={2} position="relative">
              <TextField
                fullWidth
                label="Buscar conteúdo ou quiz"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Digite para buscar..."
              />

              {open && (
                <Paper
                  elevation={4}
                  sx={{
                    position: "absolute",
                    width: "100%",
                    zIndex: 10,
                    mt: 1,
                    maxHeight: 300,
                    overflowY: "auto",
                  }}
                >
                  <List dense>
                    {/* Conteúdos */}
                    <ListItemText
                      primary="Conteúdos"
                      sx={{
                        px: 2,
                        py: 1,
                        fontWeight: 600,
                        color: "primary.main",
                      }}
                    />

                    {filteredContents.length === 0 && (
                      <ListItemText
                        primary="Nenhum conteúdo encontrado"
                        sx={{ px: 2, color: "text.secondary" }}
                      />
                    )}

                    {filteredContents.map((content) => (
                      <ListItemButton
                        key={`content-${content.id}`}
                        onClick={() => {
                          addSequenceToSection(
                            sectionIndex,
                            "content",
                            content.id,
                          );
                          setSearch("");
                          setOpen(false);
                        }}
                        sx={{ pl: 4 }}
                      >
                        {content.title}
                      </ListItemButton>
                    ))}

                    {/* Quizzes */}
                    <ListItemText
                      primary="Quizzes"
                      sx={{
                        px: 2,
                        py: 1,
                        fontWeight: 600,
                        color: "secondary.main",
                        mt: 1,
                      }}
                    />

                    {filteredForms.length === 0 && (
                      <ListItemText
                        primary="Nenhum quiz encontrado"
                        sx={{ px: 2, color: "text.secondary" }}
                      />
                    )}

                    {filteredForms.map((form) => (
                      <ListItemButton
                        key={`form-${form.id}`}
                        onClick={() => {
                          addSequenceToSection(sectionIndex, "form", form.id);
                          setSearch("");
                          setOpen(false);
                        }}
                        sx={{ pl: 4 }}
                      >
                        {form.title}
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
          </ClickAwayListener>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

function SortableSequence({
  sequence,
  removeSequenceFromSection,
  sectionIndex,
  contents,
  forms,
}: {
  sequence: any;
  seqIndex: number;
  removeSequenceFromSection: (
    sectionIndex: number,
    sequence: {
      id?: number;
      tempId?: string;
    },
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

  const isContent = !!sequence.content_id;
  const isForm = !!sequence.form_id;

  const content = isContent
    ? contents.find((c) => c.id === sequence.content_id)
    : undefined;

  const formItem = isForm
    ? forms.find((f) => f.id === sequence.form_id)
    : undefined;

  const item = isContent ? content : formItem;

  const type = isContent ? "Conteúdo" : "Quiz";
  const typeColor = isContent ? "primary.main" : "secondary.main";

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
        primary={
          <Typography fontWeight={500}>
            {item?.title ?? "Item não encontrado"}
          </Typography>
        }
        secondary={
          <Typography variant="caption" color={typeColor}>
            {type}
          </Typography>
        }
      />

      <ListItemSecondaryAction>
        <IconButton
          color="error"
          onClick={() => removeSequenceFromSection(sectionIndex, sequence)}
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
    }),
  );

  const [form, setForm] = useState({
    name: "",
    description: "",
    control_period: false,
    start_date: "",
    end_date: "",
    show_after_completion: false,
    has_progression: false,
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

  const removeInvalidSequences = (
    sections: typeof form.sections,
    contents: any[],
    forms: any[],
  ) => {
    return sections.map((section) => ({
      ...section,
      sequences: section.sequences.filter((seq) => {
        if (seq.content_id) {
          return contents.some((c) => c.id === seq.content_id);
        }
        if (seq.form_id) {
          return forms.some((f) => f.id === seq.form_id);
        }
        return false;
      }),
    }));
  };

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
              : `section-temp-${section.tempId}`) === activeId,
        );

        const newIndex = prev.sections.findIndex(
          (section) =>
            (section.id
              ? `section-${section.id}`
              : `section-temp-${section.tempId}`) === overId,
        );

        if (oldIndex === -1 || newIndex === -1) return prev;

        const newSections = arrayMove(prev.sections, oldIndex, newIndex).map(
          (section, index) => ({ ...section, order: index }),
        );

        return { ...prev, sections: newSections };
      });
    }

    // Handle sequence reordering within a section
    if (activeId.startsWith("sequence-") && overId.startsWith("sequence-")) {
      const findSequencePosition = (id: string) => {
        for (let sIndex = 0; sIndex < form.sections.length; sIndex++) {
          const seqIndex = form.sections[sIndex].sequences.findIndex((seq) => {
            const seqId = seq.id
              ? `sequence-${seq.id}`
              : `sequence-temp-${seq.tempId}`;

            return seqId === id;
          });

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
          newIndex,
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
              .map((s) => ({ id: s.id!, order: s.order })),
          ).catch(() => {
            snackbar.showError("Erro ao reordenar sequências");
          });
        }

        return { ...prev, sections: newSections };
      });
    }
  };

  useEffect(() => {
    contentService.findAll().then((res) => {
      setContents(res.data);
    });
  }, []);

  useEffect(() => {
    formsService.findAll().then((res) => {
      setForms(res.data.filter((f: any) => f.type === "quiz"));
    });
  }, []);

  useEffect(() => {
    if (!contents.length && !forms.length) return;

    setForm((prev) => ({
      ...prev,
      sections: removeInvalidSequences(prev.sections, contents, forms),
    }));
  }, [contents, forms]);

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
          has_progression: track.has_progression ?? false,
          sections:
            track.section?.map((section: any) => ({
              id: section.id,
              name: section.name,
              order: section.order,
              sequences: section.sequence?.map((seq: any) => ({
                id: seq.id,
                content_id: seq.content_id,
                form_id: seq.form_id,
                order: seq.order,
              })),
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
          tempId: nanoid(),
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
        i === index ? { ...section, name } : section,
      ),
    }));
  };

  const addSequenceToSection = (
    sectionIndex: number,
    type: "content" | "form",
    id: number,
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
          : section,
      ),
    }));
  };

  const removeSequenceFromSection = async (
    sectionIndex: number,
    sequence: {
      id?: number;
      tempId?: string;
    },
  ) => {
    const section = form.sections[sectionIndex];

    if (isEdit && id && section.id && sequence.id) {
      try {
        await TrackService.removeSequence(Number(id), section.id, sequence.id);
        snackbar.showSuccess("Item removido com sucesso");
      } catch (error) {
        snackbar.showError("Erro ao remover item");
        return;
      }
    }

    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex
          ? {
              ...s,
              sequences: s.sequences
                .filter((seq) =>
                  sequence.id
                    ? seq.id !== sequence.id
                    : seq.tempId !== sequence.tempId,
                )
                .map((seq, j) => ({ ...seq, order: j })),
            }
          : s,
      ),
    }));
  };

  const toISOStringOrNull = (date?: string) => {
    if (!date) return null;
    return new Date(`${date}T00:00:00`).toISOString();
  };

  const buildPayload = () => {
    return {
      name: form.name,
      description: form.description,
      control_period: form.control_period,
      start_date: form.control_period
        ? toISOStringOrNull(form.start_date)
        : null,

      end_date: form.control_period ? toISOStringOrNull(form.end_date) : null,

      show_after_completion: form.show_after_completion,
      has_progression: form.has_progression,
      sections: form.sections.map((section, sectionIndex) => ({
        ...(section.id ? { id: section.id } : {}),
        name: section.name,
        order: sectionIndex,
        sequences: section.sequences.map((seq, seqIndex) => ({
          ...(seq.id ? { id: seq.id } : {}),
          order: seqIndex,
          content_id: seq.content_id ?? null,
          form_id: seq.form_id ?? null,
        })),
      })),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.control_period) {
      if (!form.start_date || !form.end_date) {
        snackbar.showError("Informe a data de início e fim");
        return;
      }

      if (new Date(form.start_date) > new Date(form.end_date)) {
        snackbar.showError("Data inicial não pode ser maior que a final");
        return;
      }
    }

    const payload = buildPayload();

    console.log("Payload enviado:", payload);

    try {
      if (isEdit && id) {
        await TrackService.update(Number(id), payload);
        snackbar.showSuccess("Trilha atualizada com sucesso!");
      } else {
        await TrackService.create(payload);
        snackbar.showSuccess("Trilha criada com sucesso!");
      }
      navigate("/tracks");
    } catch (error) {
      console.error("Erro ao salvar trilha:", error);
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
          <Box display="flex" flexDirection="column" gap={2} mb={2}>
            {/* Controlar período */}
            <Box display="flex" flexDirection="column">
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
              <Typography variant="caption" color="text.secondary">
                Quando ativado, o usuário terá um tempo definido para completar
                a trilha.
              </Typography>
            </Box>

            {/* Mostrar após conclusão */}
            <Box display="flex" flexDirection="column">
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
              <Typography variant="caption" color="text.secondary">
                Quando ativado, o usuário não poderá ver os conteúdos antes de
                concluir.
              </Typography>
            </Box>

            {/* Progressão */}
            <Box display="flex" flexDirection="column">
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    checked={form.has_progression}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        has_progression: e.target.checked,
                      }))
                    }
                  />
                }
                label="Exigir conclusão da etapa anterior"
              />
              <Typography variant="caption" color="text.secondary">
                Quando ativado, o usuário só poderá avançar após concluir a
                etapa anterior.
              </Typography>
            </Box>
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
                  : `section-temp-${section.tempId}`,
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
                          : `sequence-temp-${seq.tempId}`,
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
