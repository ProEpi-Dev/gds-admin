import { useEffect, useState } from "react";
import { ContentService } from "../../api/services/content.service";
import { useNavigate } from "react-router-dom";

export default function ContentList() {
  const [contents, setContents] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    ContentService.list().then((res) => {
      setContents(res.data);
    });
  }, []);

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
                      background: "#e3f2fd",
                      color: "#1976d2",
                      padding: "4px 8px",
                      borderRadius: 4,
                      marginRight: 6,
                      fontSize: 12,
                    }}
                  >
                    #{t.tag_id}
                  </span>
                ))}
              </td>

              <td style={{ padding: 12 }}>
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
                  }}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
