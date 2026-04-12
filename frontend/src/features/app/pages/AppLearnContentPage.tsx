import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import DOMPurify from "dompurify";
import { useNavigate, useParams } from "react-router-dom";
import UserLayout from "../../../components/layout/UserLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { TrackProgressService } from "../../../api/services/track-progress.service";
import { useTrackProgressByParticipationAndCycle } from "../../track-progress/hooks/useTrackProgress";
import { contentService } from "../../../api/services/content.service";
import { ProgressStatus } from "../../../types/track-progress.types";

function sanitizeHtml(rawHtml: string): string {
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "iframe",
      "blockquote",
      "code",
      "pre",
      "span",
      "div",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "class",
      "style",
      "target",
      "rel",
      "width",
      "height",
      "frameborder",
      "allowfullscreen",
      "allow",
      "data-list",
      "data-checked",
    ],
    ALLOW_DATA_ATTR: true,
  });
}

export default function AppLearnContentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const snackbar = useSnackbar();
  const queryClient = useQueryClient();

  const {
    cycleId: cycleIdParam,
    sequenceId: sequenceIdParam,
    contentId: contentIdParam,
  } = useParams<{
    cycleId: string;
    sequenceId: string;
    contentId: string;
  }>();

  const cycleId = cycleIdParam ? parseInt(cycleIdParam, 10) : null;
  const sequenceId = sequenceIdParam ? parseInt(sequenceIdParam, 10) : null;
  const contentId = contentIdParam ? parseInt(contentIdParam, 10) : null;
  const participationId = user?.participation?.id ?? null;

  const { data: progress, isLoading: progressLoading } =
    useTrackProgressByParticipationAndCycle(participationId, cycleId);

  const { data: content, isLoading: contentLoading, error: contentError } = useQuery({
    queryKey: ["app-learn", "content", contentId],
    queryFn: () => (contentId ? contentService.findOne(contentId) : null),
    enabled: Boolean(contentId),
  });

  const sequenceProgress = useMemo(() => {
    if (!progress || !sequenceId) return null;
    return (
      progress.sequence_progress?.find((sp) => sp.sequence_id === sequenceId) ?? null
    );
  }, [progress, sequenceId]);

  const isLocked = sequenceId
    ? (progress?.sequence_locked?.[sequenceId] ?? false)
    : true;
  const isCompleted = sequenceProgress?.status === ProgressStatus.COMPLETED;

  const completeContentMutation = useMutation({
    mutationFn: async () => {
      if (!progress?.id || !sequenceId) {
        throw new Error("Progresso da sequência não encontrado");
      }
      await TrackProgressService.completeContent(progress.id, sequenceId);
    },
    onSuccess: async () => {
      snackbar.showSuccess("Conteúdo marcado como concluído");
      await queryClient.invalidateQueries({
        queryKey: ["track-progress", participationId, cycleId],
      });
      navigate(`/app/aprenda/ciclo/${cycleId}`);
    },
    onError: () => {
      snackbar.showError("Não foi possível marcar o conteúdo como concluído");
    },
  });

  if (progressLoading || contentLoading) {
    return (
      <UserLayout>
        <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={28} />
        </Box>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <Stack spacing={2}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/app/aprenda/ciclo/${cycleId}`)}
          sx={{ alignSelf: "flex-start" }}
        >
          Voltar para trilha
        </Button>

        {contentError && (
          <Alert severity="error">Não foi possível carregar o conteúdo.</Alert>
        )}

        {!content && !contentError && (
          <Alert severity="warning">Conteúdo não encontrado.</Alert>
        )}

        {content && (
          <Stack spacing={2}>
            {isLocked && (
              <Alert severity="warning">
                Este conteúdo está bloqueado. Conclua as etapas anteriores para
                liberar.
              </Alert>
            )}

            <Box
              sx={{
                "& img": { maxWidth: "100%", height: "auto" },
                "& iframe": { maxWidth: "100%" },
              }}
            >
              <div
                className="ql-editor"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(content.content ?? ""),
                }}
              />
            </Box>

            {!isCompleted && !isLocked && (
              <Stack spacing={1} sx={{ pb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Ao finalizar a leitura, marque este conteúdo como concluído.
                </Typography>
                <Button
                  variant="contained"
                  disabled={completeContentMutation.isPending}
                  onClick={() => completeContentMutation.mutate()}
                >
                  {completeContentMutation.isPending
                    ? "Salvando..."
                    : "Marcar como concluído"}
                </Button>
              </Stack>
            )}
            {isCompleted && (
              <Box sx={{ pb: 2 }}>
                <Chip color="success" label="Concluído" size="small" />
              </Box>
            )}
          </Stack>
        )}
      </Stack>
    </UserLayout>
  );
}

