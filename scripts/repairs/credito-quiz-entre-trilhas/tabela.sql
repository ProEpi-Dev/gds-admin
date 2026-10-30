-- Tabela de manutenção (schema manutencao) com o estado anterior de cada rodada.
-- Padrão: credito_quiz_20261010 (rodada dos 209). Outra rodada: -v tabela=<nome>.
\if :{?tabela}
\else
  \set tabela credito_quiz_20261010
\endif
\echo '>> tabela de manutenção: manutencao.':tabela
