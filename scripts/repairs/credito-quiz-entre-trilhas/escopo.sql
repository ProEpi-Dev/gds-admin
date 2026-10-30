-- Escopo da correção sobre credito_quiz_candidatos.
-- Padrão: só quem aprovou ANTES de a janela abrir (o mesmo quiz em outra trilha; os 209).
-- Com -v incluir_nao_marcados=1: inclui também quem aprovou dentro da janela e o item
-- não ficou marcado (11 em 10/10/2026, sendo 8 em ciclos já encerrados).
\if :{?incluir_nao_marcados}
  \echo '>> escopo: aprovações antes da janela + dentro da janela não marcadas'
\else
  \echo '>> escopo: só aprovações antes da janela (outra trilha)'
  DELETE FROM credito_quiz_candidatos WHERE credit_day >= win_start;
\endif
