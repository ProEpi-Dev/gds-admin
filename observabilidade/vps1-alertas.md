# Monitoramento e alertas da VPS1 (`epially`, 212.85.20.154)

Escrito para quem (humano ou agente) precise mexer nos alertas sem repetir as
armadilhas que já custaram tempo aqui. Última revisão: 29/08/2026.

> **Não confundir com o [README.md](README.md) desta pasta**, que trata da stack
> LGTM local de desenvolvimento (docker-compose). Este documento é sobre o
> monitoramento **em produção**, no namespace `monitoring` da VPS1.
>
> A VPS1 hospeda vários projetos além do GDS — `epially`, `fnsus-dados-externos`,
> `horadopasseio-testes` — e o stack de monitoramento é compartilhado entre eles.
> O documento mora aqui por ser o repositório mais ativo, não por ser específico
> do GDS.
>
> Existe uma cópia em `/root/README-alertas.md` na própria VPS, para quem chegar
> pelo SSH sem o repositório em mãos. **Esta versão é a canônica**; ao alterar,
> atualize a de lá também:
> `scp observabilidade/vps1-alertas.md epially:/root/README-alertas.md`

## Existem DUAS stacks de observabilidade. Não confunda.

| onde | alimentada por | o que tem |
|---|---|---|
| `grafana.maolabs.com.br` | Prometheus **deste cluster** (ns `monitoring`) | infraestrutura: CPU, memória, containers, jobs |
| `gds-grafana.maolabs.com.br` | coletor OTel **externo** (`gds-otel.maolabs.com.br`) | aplicação: latência HTTP por rota, 4xx/5xx |

Mexer nas regras aqui **não** aparece no segundo Grafana. A aplicação manda OTLP
para fora do cluster; o Prometheus local nunca vê métrica HTTP.

O timezone do dashboard do segundo é "Browser Time". Quem abre de um relógio
UTC-4 lê tudo uma hora atrás do horário de Brasília. Isso já causou um
diagnóstico errado.

## O que está instalado (ns `monitoring`)

- **prometheus** — retenção 7d / 1GB, TSDB em PVC (sobrevive a restart)
- **alertmanager** — roteia por `severity`; qualquer regra com `severity: critical`
  ou `warning` cai no Discord e no e-mail sem configuração extra
- **discord-webhook** — entrega; testado nos dois sentidos (disparo e resolução)
- **blackbox-exporter** — sondas HTTP externas
- **node-exporter** — métricas da máquina
- **kube-state-metrics** — estado dos objetos do k8s (jobs, cronjobs, pods…)
- **grafana** — datasource único: o Prometheus local
- **loki** + **nginx-loki** — no ar, mas **sem nenhum coletor**. Não ingere nada.
  Ou instala-se um DaemonSet (Alloy/promtail), ou remove-se.

## Regras (configmap `prometheus-rules`, chave `alerts.yml`)

```
system_alerts          2   CPU e memória do NODE (pré-existentes)
infrastructure_alerts 12   Prometheus/Alertmanager down, sondas VBE e SisVetor, disco
container_alerts       6   throttling, memória vs limite, OOM, restart
monitoring_health      1   AlvoDeColetaCaiu: up == 0 por 15min
gds_api_alerts         2   sonda externa da API do GDS
job_alerts             3   Job/CronJob falhando
```

## Decisões que parecem estranhas mas têm motivo

**Regras de CPU exigem container vivo há >900s.**
```promql
and on (namespace, pod, container) ((time() - container_start_time_seconds) > 900)
```
Pod de Job satura a quota por natureza — não é defeito. Pior: `rate(...[10m])`
mantém o valor alto depois que o pod morre, então um pod de 1 segundo gerava
alerta de 10 minutos. E como cada execução cria um nome novo, o Alertmanager não
agrupava: um aviso por rodada, quatro por dia. Não use filtro por nome de pod;
o guarda de tempo é genérico.

**`CronJobNuncaTeveSucesso` é regra separada de `CronJobSemSucessoRecente`.**
Quando um CronJob nunca completou, `kube_cronjob_status_last_successful_time`
não existe como série — e expressão sobre métrica ausente **nunca dispara**. Foi
exatamente assim que o ETL do epially ficou 340 dias quebrado em silêncio.

**O módulo blackbox `http_2xx` NÃO é genérico**, apesar do nome. Ele exige
`_embedded` e `eventos` no corpo — específico da API do VBE. Para o GDS existe
o módulo `gds_health`, que confere `"status":"ok"` **e**
`"database":"connected"`. O segundo importa: `/v1/health` devolve 200 mesmo com
o banco fora (de propósito, para o livenessProbe não entrar em crash loop), então
quem olha só o status code não enxerga queda de banco.

**cAdvisor vem do kubelet, não de um DaemonSet.** O job apontava para um serviço
`cadvisor:8080` que nunca existiu e ficou DOWN por meses. Hoje usa o cAdvisor
embutido no kubelet via proxy do API server, com SA e ClusterRole `prometheus`.

**`GrafanaDown` foi removido.** Vigiava `up{job="grafana"}` e não existe job
`grafana`: alerta que nunca dispara é pior que alerta nenhum, porque cria falsa
segurança. Use `AlvoDeColetaCaiu` (`up == 0`), que é genérico.

## Limites de CPU: não seja mesquinho com processo de rajada

O `node-exporter` com limite de 50m ficava **88% throttled** e um scrape que
leva 0,085s demorava **7 segundos** — perto de estourar o intervalo de 15s e
perder amostras. Consumo médio real: 0,005 core.

Limite não reserva nada; só corta picos. Para exporter e coletor, prefira 500m–1000m.
Ajustados: node-exporter 1000m, blackbox 200m, discord-webhook 200m, KSM 500m.

## Cardinalidade

Retenção é 1GB. Tanto o cAdvisor quanto o kube-state-metrics são filtrados por
`metric_relabel_configs` com `action: keep` — sem isso trazem centenas de séries
por objeto. Estado atual: ~5.400 séries, ~200MB. Ao adicionar métrica, acrescente
ao `regex` do `keep` do job correspondente.

## Como alterar sem quebrar

1. Extraia: `kubectl get cm prometheus-rules -n monitoring -o jsonpath='{.data.alerts\.yml}' > /tmp/r.yml`
2. Edite e **valide** com o promtool. Atencao: `kubectl cp` nao aceita `deploy/`,
   precisa do nome do pod:
   ```bash
   POD=$(kubectl get pod -n monitoring -l app=prometheus -o jsonpath="{.items[0].metadata.name}")
   kubectl cp /tmp/r.yml "monitoring/$POD:/tmp/r.yml"
   kubectl exec -n monitoring "$POD" -- promtool check rules /tmp/r.yml
   ```
3. **Teste a expressão contra o Prometheus ao vivo, nos dois sentidos:**
   - que ela não dispara agora (sem falso positivo)
   - que ela **encontraria** um caso real — baixe o limiar ou alargue a janela e
     confirme que retorna algo. Regra que nunca dispara passa despercebida.
4. Aplique: `kubectl create configmap prometheus-rules -n monitoring --from-file=alerts.yml=/tmp/r.yml --dry-run=client -o yaml | kubectl apply -f -`
5. `kubectl rollout restart deployment/prometheus -n monitoring`
6. Confira `health=ok` em `/api/v1/rules` — regra com erro fica carregada mas inerte.

Backups de cada alteração estão aqui em `/root/`:
`prometheus.yml.bak-*`, `alerts.yml.bak-*`, `blackbox.yml.bak-*`.

## Lacunas conhecidas

- **Loki não ingere nada.** Sem coletor instalado.
- **Log de container dura ~7h** (5 arquivos rotacionados em `/var/log/pods`).
  `kubectl logs` lê só o arquivo corrente; o histórico está em `.gz` no disco.
- **Falha de banco do GDS fica invisível.** O `PrismaExceptionFilter` loga com
  `console.log`, fora do Pino — logo, fora do log estruturado e do export OTLP.
  Um 500 chega ao cliente como "An unexpected database error occurred" e a causa
  só aparece no log do pod.
- **VPS2 (`api-prod`, 198.199.87.48) não tem monitoramento nenhum.** Quando ela
  virar a produção, estará cega.

## Armadilhas de diagnóstico que já morderam

- `restartPolicy: OnFailure` faz o container reiniciar no lugar: o pod aparece
  como `Running` mesmo em crash loop. Olhe `restartCount` e `lastState`.
- O log de um container que morreu está em `kubectl logs --previous`.
- Para pegar um CronJob no ato: `kubectl create job diag --from=cronjob/NOME -n NS`.
- `kubectl exec` **sem `-i`** não encaminha stdin. Um heredoc com SQL some em
  silêncio e o comando sai com código 0. Sempre confira o efeito, não o exit code.
