import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Typography, TextField, Autocomplete, CircularProgress } from '@mui/material';
import { usersService } from '../../api/services/users.service';
import { useDebounce } from '../../hooks/useDebounce';
import type { User } from '../../types/user.types';

interface SelectUserProps {
  value?: number | null;
  onChange: (userId: number | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  label?: string;
  activeOnly?: boolean;
  /** IDs de usuários a excluir da lista (ex.: já administradores) */
  excludeIds?: number[];
}

/** Quantos resultados pedir por busca. O usuário refina digitando mais. */
const PAGE_SIZE = 50;

export default function SelectUser({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = 'Usuário',
  activeOnly = true,
  excludeIds,
}: SelectUserProps) {
  // Só o termo de busca é controlado aqui. O texto exibido fica com o
  // Autocomplete: é ele que sabe preenchê-lo com o rótulo do item selecionado,
  // e controlá-lo manualmente deixava o campo em branco depois de escolher.
  const [searchTerm, setSearchTerm] = useState('');
  const search = useDebounce(searchTerm, 400);

  /**
   * Busca no servidor.
   *
   * Antes este componente carregava `pageSize: 100` sem termo de busca e
   * filtrava no navegador. Como `GET /users` ordena por `created_at desc`, ele
   * só enxergava os 100 cadastros mais recentes — com 41 mil usuários ativos,
   * qualquer pessoa que não tivesse se inscrito nas últimas horas era invisível,
   * inclusive a que já estava selecionada no formulário.
   */
  const { data, isFetching } = useQuery({
    queryKey: ['users', 'select', { search, active: activeOnly }],
    queryFn: () =>
      usersService.findAll({
        search: search || undefined,
        active: activeOnly ? true : undefined,
        pageSize: PAGE_SIZE,
      }),
  });

  /**
   * O usuário já selecionado é buscado à parte, por id.
   *
   * Ele quase nunca está na lista de resultados — o formulário abre sem termo de
   * busca — e sem isto o campo aparece vazio mesmo tendo valor, o que passa a
   * impressão de que a participação não tem dono.
   */
  const { data: selectedUser } = useQuery({
    queryKey: ['users', 'byId', value],
    queryFn: () => usersService.findOne(value as number),
    enabled: typeof value === 'number' && value > 0,
    staleTime: 5 * 60 * 1000,
  });

  const results = (data?.data ?? []).filter(
    (user) => !excludeIds?.includes(user.id),
  );

  // O selecionado entra na lista quando a busca atual não o traz, senão o
  // Autocomplete não consegue casar `value` com nenhuma opção.
  const options: User[] =
    selectedUser && !results.some((user) => user.id === selectedUser.id)
      ? [selectedUser, ...results]
      : results;

  return (
    <>
      <Autocomplete
        value={selectedUser ?? null}
        onChange={(_, newValue) => onChange(newValue?.id ?? null)}
        onInputChange={(_, newInput, reason) => {
          // 'input' é digitação; 'reset' é a sincronia com o item escolhido e
          // não deve virar busca — senão o componente procuraria pelo rótulo
          // inteiro e a lista ficaria vazia logo após a seleção.
          if (reason === 'input') setSearchTerm(newInput.trim());
          else if (reason === 'clear') setSearchTerm('');
        }}
        options={options}
        // A filtragem já aconteceu no servidor; refiltrar aqui esconderia
        // resultados legítimos que não casam com o texto exato.
        filterOptions={(x) => x}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        getOptionLabel={(option) => `${option.name} (${option.email})`}
        loading={isFetching}
        noOptionsText={
          search ? 'Nenhum usuário encontrado' : 'Digite para buscar'
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
            required={required}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isFetching ? <CircularProgress size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            {option.name} ({option.email})
          </li>
        )}
      />
      {helperText && !error && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.75 }}>
          {helperText}
        </Typography>
      )}
    </>
  );
}
