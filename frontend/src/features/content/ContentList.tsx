import { useEffect, useState } from "react";
import { ContentService } from "../../api/services/content.service";
import { useNavigate } from "react-router-dom";
import "quill/dist/quill.snow.css";
import "./ContentPreview.css";

export default function ContentList() {
  const [contents, setContents] = useState<any[]>([]);
  const [previewContent, setPreviewContent] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    ContentService.list().then((res) => {
      setContents(res.data);
    });
  }, []);

  // Função para processar o HTML e tornar imagens responsivas
  const processContentHtml = (html: string) => {
    if (!html) return "";
    
    // Remove atributos width e height das imagens
    let processedHtml = html.replace(
      /<img([^>]*?)(?:\s+width="[^"]*"|\s+height="[^"]*")/gi,
      '<img$1'
    );
    
    // Remove estilos inline de width e height das imagens
    processedHtml = processedHtml.replace(
      /<img([^>]*?)style="([^"]*?)"/gi,
      (_match, before, style) => {
        const newStyle = style
          .replace(/width\s*:\s*[^;]+;?/gi, '')
          .replace(/height\s*:\s*[^;]+;?/gi, '');
        return `<img${before}style="${newStyle}"`;
      }
    );
    
    return processedHtml;
  };

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1 style={{ margin: 0, fontWeight: 600 }}>Conteúdos</h1>

        <button
          onClick={() => navigate("/contents/new")}
          style={{
            background: "#1976d2",
            color: "white",
            padding: "10px 16px",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Novo Conteúdo
        </button>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "white",
        }}
      >
        <thead>
          <tr>
            {["ID", "Título", "Slug", "Tags", "Ações"].map((th) => (
              <th
                key={th}
                style={{
                  textAlign: "left",
                  padding: "12px 10px",
                  borderBottom: "2px solid #e0e0e0",
                  fontWeight: 600,
                }}
              >
                {th}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {contents.length === 0 && (
            <tr>
              <td
                colSpan={5}
                style={{ padding: 40, textAlign: "center", color: "#777" }}
              >
                Nenhum registro encontrado
              </td>
            </tr>
          )}

          {contents.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 12 }}>{item.id}</td>
              <td style={{ padding: 12 }}>{item.title}</td>
              <td style={{ padding: 12 }}>{item.slug}</td>
              <td style={{ padding: 12 }}>
                {item.content_tag?.map((t: any) => (
                  <span
                    key={t.id}
                    style={{
                      background: t.tag.color || "#e3f2fd",
                      color: "#fff",
                      padding: "4px 8px",
                      borderRadius: 4,
                      marginRight: 6,
                      fontSize: 12,
                      display: "inline-block",
                    }}
                  >
                    #{t.tag.name}
                  </span>
                ))}
              </td>

              <td style={{ padding: 12 }}>
                <button
                  onClick={() => setPreviewContent(item)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border: "1px solid #4caf50",
                    color: "#4caf50",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 14,
                    marginRight: 8,
                  }}
                >
                  Preview
                </button>

                <button
                  onClick={() => navigate(`/contents/${item.id}/edit`)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border: "1px solid #1976d2",
                    color: "#1976d2",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 14,
                    marginRight: 8,
                  }}
                >
                  Editar
                </button>

                <button
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Tem certeza que deseja excluir este conteúdo?"
                      )
                    ) {
                      await ContentService.delete(item.id);
                      setContents((prev) =>
                        prev.filter((c) => c.id !== item.id)
                      );
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border: "1px solid #d32f2f",
                    color: "#d32f2f",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL DE PREVIEW MOBILE */}
      {previewContent && (
        <div
          onClick={() => setPreviewContent(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "375px",
              height: "667px",
              backgroundColor: "#000",
              borderRadius: "36px",
              padding: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Notch do celular */}
            <div
              style={{
                position: "absolute",
                top: "0",
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
            <div
              style={{
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
              <div
                style={{
                  backgroundColor: "#1976d2",
                  color: "white",
                  padding: "40px 16px 16px 16px",
                  fontSize: "18px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{previewContent.title}</span>
                <button
                  onClick={() => setPreviewContent(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "white",
                    fontSize: "24px",
                    cursor: "pointer",
                    padding: "0 8px",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Conteúdo */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  backgroundColor: "#f5f5f5",
                }}
              >
                <div
                  style={{
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
                      __html: processContentHtml(previewContent.content) 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
