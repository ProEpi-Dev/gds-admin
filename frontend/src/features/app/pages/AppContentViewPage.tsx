import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { contentService } from "../../../api/services/content.service";

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

export default function AppContentViewPage() {
  const navigate = useNavigate();
  const { contentId: contentIdParam } = useParams<{ contentId: string }>();
  const contentId = contentIdParam ? Number(contentIdParam) : null;

  const { data: content, isLoading, error } = useQuery({
    queryKey: ["app-content-view", contentId],
    queryFn: () => (contentId ? contentService.findOne(contentId) : null),
    enabled: Boolean(contentId),
  });

  const description = useMemo(() => {
    if (!content) return "";
    return content.summary?.trim() || content.description?.trim() || "";
  }, [content]);

  if (isLoading) {
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
          onClick={() => navigate("/app/conteudos")}
          sx={{ alignSelf: "flex-start" }}
        >
          Voltar para conteúdos
        </Button>

        {error && (
          <Alert severity="error">Não foi possível carregar este conteúdo.</Alert>
        )}

        {!content && !error && (
          <Alert severity="warning">Conteúdo não encontrado.</Alert>
        )}

        {content && (
          <Stack spacing={2}>
            <Stack spacing={1}>
              <Typography variant="h5" fontWeight={700}>
                {content.title ?? `Conteúdo #${content.id}`}
              </Typography>
              {content.content_type?.name && (
                <Chip
                  label={content.content_type.name}
                  size="small"
                  sx={{
                    width: "fit-content",
                    backgroundColor: content.content_type.color || undefined,
                    color: content.content_type.color ? "#fff" : undefined,
                  }}
                />
              )}
              {description && (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              )}
            </Stack>

            {content.thumbnail_url && (
              <Box
                component="img"
                src={content.thumbnail_url}
                alt={content.title ?? `Thumbnail do conteúdo ${content.id}`}
                sx={{
                  width: "100%",
                  maxHeight: 260,
                  objectFit: "cover",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
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
          </Stack>
        )}
      </Stack>
    </UserLayout>
  );
}
