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

## 2026-08-29 — ChatGPT

**Tarefa:** Corrigir lentidão ao abrir Atividades para Anna e remover perfil Dayan duplicado.

**Diagnóstico:** `app/atividades/page.tsx` fazia `getUser()` e depois `getMeuPerfil()`, o que repetia a consulta ao Supabase Auth. Além disso, havia dois perfis Dayan na mesma casa; o perfil antigo não tinha atividades nem referências de dados.

**Alterações:**
- `app/atividades/page.tsx`: removido o `getUser()` redundante; `getMeuPerfil()` já valida a sessão e retorna o perfil.
- `components/app/Launcher.tsx`: adicionada pré-carga (`router.prefetch`) das rotas dos módulos assim que o launcher abre.
- Navegação continua com feedback visual e agora aproveita o RSC pré-carregado, reduzindo o atraso no primeiro toque.
- Supabase: removido o perfil Dayan antigo/vazio `6f8993b9-875a-486f-9cc0-79be8b90a599`; o perfil atual `a8d93725-90e7-48bc-b3a1-ec9bab423aa4` permanece com username `dayan` e as 3 atividades existentes.

**Commits:** `c0660c5cf89c512644a3e2bf5019a20a4ac8885e`, `b586cbfc0cf698d44090a053cb2d81f081574d3e`.

**Próximo passo:** testar no celular da Anna após o deploy da Vercel. Se ainda houver vários segundos, medir o tempo da renderização de `/atividades` e investigar as quatro queries paralelas/Cold Start da Vercel-Supabase, em vez de adicionar mais cliques ou animações.

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

---

## 2026-08-28 — ChatGPT

**Tarefa:** Implementar lista de compras com arquivamento e tarefa FLEX com validação.

**Banco/Supabase:**
- Migration `add_flex_activity_validation` adicionou `activities.tipo` (`normal`/`flex`), `activities.condicao`, `activity_completions.validacao_resultado` e `activity_completions.verificado_em`.
- Lista de compras: itens pendentes na aba Hoje, arquivamento como comprado e área de Arquivados.
- Flex: condição verdadeira contabiliza como atividade; condição falsa registra a verificação, mas não conta.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Corrigir erro ao criar novo usuário no módulo Usuários.

**Alterações:**
- Adicionado campo visível Nome de usuário no cadastro.
- Backend aceita username explícito ou gera um a partir do nome.
- Login por username ou e-mail continua sendo suportado.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Melhorar a tipografia do app para uma aparência mais premium/fintech.

**Alterações:**
- `app/layout.tsx`: fonte Inter.
- `app/globals.css`: Inter como fonte global.

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
