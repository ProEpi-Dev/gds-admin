import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SelectUser from './SelectUser';
import { usersService } from '../../api/services/users.service';
import type { User } from '../../types/user.types';

vi.mock('../../api/services/users.service', () => ({
  usersService: {
    findAll: vi.fn(),
    findOne: vi.fn(),
  },
}));

const criarUsuario = (id: number, name: string, email: string): User =>
  ({ id, name, email, active: true }) as User;

/** Usuário antigo: não aparece na primeira página de resultados. */
const DAVI_ANTIGO = criarUsuario(43946, 'Davi Marins Camilo', 'marinsdavi10@gmail.com');
/** Usuário recente: é o que o componente antigo enxergava. */
const DAVI_RECENTE = criarUsuario(46210, 'Davi Marins Camilo', '252035205@aluno.unb.br');

function renderizar(props: Partial<React.ComponentProps<typeof SelectUser>> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SelectUser value={null} onChange={() => {}} {...props} />
    </QueryClientProvider>,
  );
}

describe('SelectUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersService.findAll).mockResolvedValue({
      data: [DAVI_RECENTE],
    } as never);
    vi.mocked(usersService.findOne).mockResolvedValue(DAVI_ANTIGO);
  });

  it('mostra o usuário selecionado mesmo fora da lista de resultados', async () => {
    // O bug: `GET /users` ordena por created_at desc e o componente carregava
    // só os 100 primeiros. Quem se cadastrou antes disso sumia, e o campo
    // aparecia vazio mesmo com valor.
    renderizar({ value: 43946 });

    await waitFor(() => {
      expect(usersService.findOne).toHaveBeenCalledWith(43946);
    });
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue(
        'Davi Marins Camilo (marinsdavi10@gmail.com)',
      );
    });
  });

  it('não busca por id quando não há valor selecionado', async () => {
    renderizar({ value: null });

    await waitFor(() => expect(usersService.findAll).toHaveBeenCalled());
    expect(usersService.findOne).not.toHaveBeenCalled();
  });

  it('manda o termo digitado para o servidor', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.type(screen.getByRole('combobox'), 'marinsdavi');

    // Debounce de 400ms: a busca sai depois que o usuário para de digitar.
    await waitFor(
      () => {
        expect(usersService.findAll).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'marinsdavi' }),
        );
      },
      { timeout: 3000 },
    );
  });

  it('não manda search na carga inicial', async () => {
    renderizar();

    await waitFor(() => expect(usersService.findAll).toHaveBeenCalled());
    expect(usersService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: undefined }),
    );
  });

  it('respeita excludeIds', async () => {
    const user = userEvent.setup();
    renderizar({ excludeIds: [46210] });

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => expect(usersService.findAll).toHaveBeenCalled());
    expect(
      screen.queryByText(/252035205@aluno\.unb\.br/),
    ).not.toBeInTheDocument();
  });
});
