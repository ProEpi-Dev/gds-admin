import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Box } from '@mui/material';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

// Função para converter URL de vídeo em embed
const convertVideoUrlToEmbed = (url: string): string => {
  // YouTube
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }

  return url;
};

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: string | number;
  maxHeight?: string | number;
  readOnly?: boolean;
}

export interface RichTextEditorRef {
  getContent: () => string;
  setContent: (html: string) => void;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      value = '',
      onChange,
      placeholder = 'Digite ou cole aqui o conteúdo...',
      minHeight = '400px',
      maxHeight = '600px',
      readOnly = false,
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);
    const isInitializing = useRef(true);

    // Expor métodos via ref
    useImperativeHandle(ref, () => ({
      getContent: () => {
        return quillRef.current?.root.innerHTML || '';
      },
      setContent: (html: string) => {
        if (quillRef.current) {
          quillRef.current.root.innerHTML = html;
        }
      },
    }));

    // Inicializar Quill
    useEffect(() => {
      if (editorRef.current && !quillRef.current) {
        quillRef.current = new Quill(editorRef.current, {
          theme: 'snow',
          readOnly,
          modules: {
            toolbar: readOnly
              ? false
              : [
                  [{ header: [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  [{ color: [] }, { background: [] }],
                  [{ align: [] }],
                  ['link', 'image', 'video'],
                  ['clean'],
                ],
          },
          placeholder,
        });

        // Interceptar inserção de vídeo para converter URLs em embeds
        if (!readOnly) {
          const toolbar = quillRef.current.getModule('toolbar') as any;
          toolbar.addHandler('video', () => {
            const range = quillRef.current?.getSelection();
            if (range) {
              const url = prompt('Digite a URL do vídeo do YouTube:');
              if (url) {
                const embedHtml = convertVideoUrlToEmbed(url);
                if (embedHtml !== url) {
                  // É um embed, insere como HTML
                  quillRef.current?.clipboard.dangerouslyPasteHTML(
                    range.index,
                    embedHtml
                  );
                } else {
                  // Não é uma URL conhecida, insere como link normal
                  quillRef.current?.insertEmbed(range.index, 'video', url);
                }
              }
            }
          });

          // Listener de mudanças
          quillRef.current.on('text-change', (_delta, _oldDelta, source) => {
            // Ignorar mudanças durante inicialização ou mudanças programáticas
            if (isInitializing.current || source === 'silent') {
              return;
            }
            
            if (quillRef.current && onChange) {
              const html = quillRef.current.root.innerHTML;
              onChange(html);
            }
          });
        }

        // Setar conteúdo inicial se fornecido
        if (value && quillRef.current) {
          quillRef.current.root.innerHTML = value;
        }

        // Após inicialização, permitir onChange
        setTimeout(() => {
          isInitializing.current = false;
        }, 100);
      }
    }, [readOnly, placeholder]);

    // Atualizar conteúdo quando value mudar externamente
    useEffect(() => {
      if (quillRef.current && value !== undefined) {
        const currentContent = quillRef.current.root.innerHTML;
        // Normalizar comparação removendo espaços e tags vazias
        const normalizedCurrent = currentContent.replace(/<p><br><\/p>/g, '').trim();
        const normalizedValue = value.replace(/<p><br><\/p>/g, '').trim();
        
        if (normalizedCurrent !== normalizedValue) {
          // Temporariamente bloquear onChange enquanto atualiza
          const wasInitializing = isInitializing.current;
          isInitializing.current = true;
          quillRef.current.root.innerHTML = value;
          
          // Restaurar depois de um pequeno delay
          setTimeout(() => {
            isInitializing.current = wasInitializing;
          }, 50);
        }
      }
    }, [value]);

    return (
      <Box
        ref={editorRef}
        sx={{
          backgroundColor: 'white',
          minHeight,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          '& .ql-toolbar': {
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            backgroundColor: 'white',
            borderBottom: '1px solid',
            borderColor: 'divider',
          },
          '& .ql-container': {
            minHeight: `calc(${minHeight} - 42px)`,
            maxHeight,
            overflowY: 'auto',
          },
          '& .ql-editor': {
            minHeight: `calc(${minHeight} - 42px)`,
          },
        }}
      />
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
