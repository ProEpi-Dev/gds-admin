import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import DOMPurify from "dompurify";
import "quill/dist/quill.snow.css";
import "../../features/content/ContentPreview.css";

interface MobilePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  htmlContent: string;
}

export default function MobilePreviewDialog({
  open,
  onClose,
  title,
  htmlContent,
}: MobilePreviewDialogProps) {
  // Função para processar e sanitizar o HTML
  const processContentHtml = (html: string) => {
    if (!html) return "";

    // Remove atributos width e height das imagens
    let processedHtml = html.replace(
      /<img([^>]*?)(?:\s+width="[^"]*"|\s+height="[^"]*")/gi,
      "<img$1"
    );

    // Remove estilos inline de width e height das imagens
    processedHtml = processedHtml.replace(
      /<img([^>]*?)style="([^"]*)"/gi,
      (_match, before, style) => {
        const newStyle = style
          .replace(/width\s*:\s*[^;]+;?/gi, "")
          .replace(/height\s*:\s*[^;]+;?/gi, "");
        return `<img${before}style="${newStyle}"`;
      }
    );

    // Sanitiza o HTML com DOMPurify para prevenir XSS
    return DOMPurify.sanitize(processedHtml, {
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
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: "transparent",
          boxShadow: "none",
          overflow: "visible",
        },
      }}
    >
      <DialogContent sx={{ p: 0, overflow: "visible" }}>
        <Box
          sx={{
            position: "relative",
            width: "375px",
            height: "667px",
            backgroundColor: "#000",
            borderRadius: "36px",
            padding: "12px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            margin: "0 auto",
          }}
        >
          {/* Notch do celular */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "150px",
              height: "30px",
              backgroundColor: "#000",
              borderRadius: "0 0 20px 20px",
              zIndex: 10,
            }}
          />

          {/* Tela do celular */}
          <Box
            sx={{
              width: "100%",
              height: "100%",
              backgroundColor: "#fff",
              borderRadius: "26px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header do app */}
            <Box
              sx={{
                backgroundColor: "primary.main",
                color: "white",
                padding: "40px 16px 16px 16px",
                fontSize: "18px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h6" sx={{ color: "white" }}>
                {title}
              </Typography>
              <IconButton
                onClick={onClose}
                sx={{ color: "white" }}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Conteúdo */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                backgroundColor: "#f5f5f5",
              }}
            >
              <Box
                sx={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  padding: "16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                {/* Renderiza o conteúdo HTML do Quill */}
                <div
                  className="ql-editor mobile-preview-content"
                  dangerouslySetInnerHTML={{
                    __html: processContentHtml(htmlContent),
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
