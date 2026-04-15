import type { IntegrationMessage } from '../../../api/services/report-integrations.service';

const DEFAULT_ECHO_WINDOW_MS = 3 * 60 * 1000;

/**
 * Remove mensagens recebidas que são cópia imediata do que o participante acabou de enviar:
 * o sistema externo devolve o mesmo texto como "inbound", o que duplica a linha do tempo.
 */
export function filterEchoInboundMessages(
  messages: IntegrationMessage[],
  echoWindowMs = DEFAULT_ECHO_WINDOW_MS,
): IntegrationMessage[] {
  const ordered = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const out: IntegrationMessage[] = [];
  for (const msg of ordered) {
    if (msg.direction === 'inbound') {
      const isLikelyEcho = out.some((prior) => {
        if (prior.direction !== 'outbound') return false;
        if (prior.body.trim() !== msg.body.trim()) return false;
        const dt =
          new Date(msg.createdAt).getTime() - new Date(prior.createdAt).getTime();
        return dt >= 0 && dt <= echoWindowMs;
      });
      if (isLikelyEcho) continue;
    }
    out.push(msg);
  }
  return out;
}
