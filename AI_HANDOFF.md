# AI HANDOFF — Claude ↔ ChatGPT

Este arquivo é o caderno de passagem entre os agentes de IA que trabalham no projeto.

## Regras

- Claude deve registrar notas para ChatGPT/Codex.
- ChatGPT/Codex deve registrar notas para Claude.
- Sempre leia este arquivo antes de uma tarefa relevante.
- Sempre atualize este arquivo ao terminar uma tarefa relevante.
- Nunca registrar senhas, tokens, chaves de API, service-role keys ou outros segredos.
- Manter as notas mais recentes no topo.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Implementar edição completa de tarefas no módulo Atividades.

**Alterações:**
- `components/app/AtividadesV2Client.tsx` foi atualizado com editor completo de tarefa existente.
- Botão de lápis `✎` disponível nas tarefas de Hoje e na Semana, em PC e celular.
- Editor permite alterar: nome, responsável, tipo Normal/Flex, condição da Flex, recorrência e dias da semana.
- A edição usa `update` pelo ID da atividade, portanto não cria tarefa duplicada.
- Para tarefas não diárias, é possível selecionar múltiplos dias da semana.
- Flex continua exigindo condição e preserva a regra de validação.
- Adicionado botão de ditado por voz no campo de tarefa, usando SpeechRecognition/WebkitSpeechRecognition quando disponível no navegador.
- O mesmo botão de ditado foi colocado na criação de nova tarefa.
- Salvamento mostra estado `Salvando…` e valida campos obrigatórios.
- Exclusão continua desativando a atividade para preservar histórico.

**Commit:** `f0ec2ae6ba1bbb8566b625fea636c2fa9a293fda`.

**Observação:** A alteração foi feita no componente V2 existente e mantém lista de compras, Flex/validação, painel e navegação. Próximo passo é validar o build/deploy da Vercel e testar edição no PC e celular.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Implementar lista de compras com arquivamento e tarefa FLEX com validação.

**Banco/Supabase:**
- Migration `add_flex_activity_validation` adicionou `activities.tipo` (`normal`/`flex`), `activities.condicao`, `activity_completions.validacao_resultado` e `activity_completions.verificado_em`.
- Foi mantida a unicidade existente de uma conclusão por atividade/data.

**Lista de compras:**
- Criado `components/app/AtividadesV2Client.tsx`.
- A aba Hoje mostra os itens pendentes da lista de compras.
- A aba Lista de compras mostra todos os itens pendentes e uma área de Arquivados.
- Marcar um item como comprado faz `comprado=true` e o item sai da lista principal, indo para Arquivados/Painel.
- É possível Reabrir um item arquivado.

**FLEX / validação:**
- Nova tarefa pode ser criada como `Tarefa normal` ou `Flex · validação`.
- Flex exige uma condição, por exemplo: `Há roupa na máquina?`.
- Ao executar uma Flex, o usuário escolhe `Não` ou `Sim, condição verdadeira`.
- A verificação é sempre registrada.
- `validacao_resultado=true` conta como atividade realizada.
- `validacao_resultado=false` fica registrada como verificação feita, mas NÃO conta como atividade realizada.
- O histórico/painel exibe verificações e quantas foram contabilizadas.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Corrigir erro ao criar novo usuário no módulo Usuários.

**Alterações:**
- Adicionado campo visível Nome de usuário no cadastro.
- Backend aceita username explícito ou gera um a partir do nome.
- Login por username ou e-mail continua sendo suportado.

**Commits:** `0740846` e `3998bdb`.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Melhorar a tipografia do app para uma aparência mais premium/fintech.

**Alterações:**
- `app/layout.tsx`: fonte Inter.
- `app/globals.css`: Inter como fonte global.

**Commits:** `92609d3` e `326f814`.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Corrigir duplicidade de membro na lista "Atribuir a".

**Alteração:** `getMembrosDaCasa()` deduplica perfis com mesmo nome e prioriza o mais recente.

**Commit:** `800525a5fc02660ed1ca8568eb7a072a0dbd81c1`.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Corrigir feedback visual dos botões de módulos e reduzir a sensação de atraso na navegação.

**Alterações:** hover no PC, pressionamento no PC/celular, foco de teclado e spinner de navegação.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Implantação do protocolo de colaboração Claude ↔ ChatGPT.

**Alterações:**
- Atualizado `AGENTS.md` com protocolo obrigatório de handoff.
- Criado `AI_HANDOFF.md` como registro compartilhado.
