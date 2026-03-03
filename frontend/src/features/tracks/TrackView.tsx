import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { TrackService } from "../../api/services/track.service";
import { useLocation } from "react-router-dom";
import { contentService } from "../../api/services/content.service";
import { formsService } from "../../api/services/forms.service";
import { Visibility as VisibilityIcon } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import MobilePreviewDialog from "../../components/common/MobilePreviewDialog";
import FormPreview from "../../components/form-builder/FormPreview";
import type { Form } from "../../types/form.types";

export default function TrackView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [rawTrack, setRawTrack] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };
  const [previewContent, setPreviewContent] = useState<{
    title: string;
    content: string;
  } | null>(null);

  const handlePreview = async (seq: any) => {
    if (!seq.content_id) return;

    const content = await contentService.findOne(seq.content_id);

    setPreviewContent({
      title: content.title,
      content: content.content,
    });
  };

  const [previewQuizOpen, setPreviewQuizOpen] = useState(false);
  const [quizToPreview, setQuizToPreview] = useState<Form | null>(null);

  // Carregar trilha primeiro
  useEffect(() => {
    if (!id) return;
    TrackService.get(Number(id)).then((res) => setRawTrack(res.data));
  }, [id, location.key]);

  // Carregar conteúdos e quizzes do contexto da trilha (para filtrar sequências)
  const trackContextId = rawTrack?.context_id;
  useEffect(() => {
    if (trackContextId == null) return;
    contentService.findAll({ contextId: trackContextId }).then((res) => setContents(res.data));
    formsService
      .findAll({ type: "quiz", active: true, page: 1, pageSize: 100, contextId: trackContextId })
      .then((res) => setForms(res.data));
  }, [trackContextId]);

  // Trilha exibida: sequências filtradas (ocultar conteúdos/quizzes removidos)
  const track = useMemo(() => {
    if (!rawTrack) return null;
    if (contents.length === 0 && forms.length === 0) return rawTrack;
    return {
      ...rawTrack,
      section: rawTrack.section?.map((section: any) => ({
        ...section,
        sequence: section.sequence?.filter((seq: any) => {
          if (seq.content_id) return contents.some((c) => c.id === seq.content_id);
          if (seq.form_id) return forms.some((f) => f.id === seq.form_id);
          return false;
        }),
      })),
    };
  }, [rawTrack, contents, forms]);

  if (!track) {
    return (
      <Box p={4}>
        <Typography color="text.secondary">Carregando trilha…</Typography>
      </Box>
    );
  }

  const handlePreviewQuiz = (seq: any) => {
    if (!seq.form_id) return;

    const form = forms.find((f) => f.id === seq.form_id);
    if (!form) return;

    setQuizToPreview(form);
    setPreviewQuizOpen(true);
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/tracks")}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" ml={2}>
          {track.name}
        </Typography>
      </Box>

      {/* Infos gerais */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" mb={2}>
          {track.description || "Sem descrição"}
        </Typography>

        <Box display="flex" flexDirection="column" gap={1}>
          {/* Linha 1 – período */}
          {track.control_period && (
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Chip
                label={`${formatDate(track.start_date)} - ${formatDate(
                  track.end_date,
                )}`}
                variant="outlined"
                size="small"
                sx={{
                  borderColor: "info.main",
                  color: "info.main",
                }}
              />

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ lineHeight: 1.4 }}
              >
                A trilha ficará disponível apenas dentro desse período
              </Typography>
            </Box>
          )}

          {/* Linha 2 – pós conclusão */}
          {track.show_after_completion && (
            <Box>
              <Chip
                label="Mostra após conclusão"
                variant="outlined"
                size="small"
                sx={{
                  borderColor: "secondary.main",
                  color: "secondary.main",
                }}
              />
            </Box>
          )}
          {/* Linha 3 – progressão obrigatória */}
          {track.has_progression && (
            <Box>
              <Chip
                label="Progressão obrigatória"
                variant="outlined"
                size="small"
                sx={{
                  borderColor: "warning.main",
                  color: "warning.main",
                }}
              />
            </Box>
          )}
        </Box>
      </Paper>

      {/* Seções */}
      {track.section?.map((section: any) => (
        <Accordion key={section.id} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{section.name}</Typography>
          </AccordionSummary>

          <AccordionDetails>
            <List>
              {section.sequence.map((seq: any) => {
                return (
                  <ListItem
                    key={seq.id}
                    disablePadding
                    secondaryAction={
                      (seq.content_id || seq.form_id) && (
                        <Tooltip title="Visualizar">
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (seq.content_id) handlePreview(seq);
                              if (seq.form_id) handlePreviewQuiz(seq);
                            }}
                          >
                            <VisibilityIcon color="success" />
                          </IconButton>
                        </Tooltip>
                      )
                    }
                  >
                    <ListItemButton
                      onClick={() => {
                        if (seq.content_id) {
                          handlePreview(seq);
                        }
                      }}
                      sx={{ cursor: "pointer" }}
                    >
                      <ListItemText
                        primary={seq.content?.title || seq.form?.title}
                        secondary={seq.content ? "Conteúdo" : "Quiz"}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}

      <MobilePreviewDialog
        open={!!previewContent}
        onClose={() => setPreviewContent(null)}
        title={previewContent?.title || ""}
        htmlContent={previewContent?.content || ""}
      />

      <Dialog
        open={previewQuizOpen}
        onClose={() => setPreviewQuizOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Preview do Quiz</DialogTitle>

        <DialogContent>
          {quizToPreview?.latestVersion ? (
            <FormPreview definition={quizToPreview.latestVersion.definition} />
          ) : (
            <Typography>Nenhuma versão disponível para preview</Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPreviewQuizOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
