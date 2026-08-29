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

**Arquivos:**
- `components/app/AtividadesV2Client.tsx` — nova interface do módulo.
- `app/atividades/page.tsx` — passou a usar o novo cliente.
- `lib/types/database.ts` — tipos atualizados para FLEX/validação.

**Commits:** `e0d91fb`, `fa8866f`, `3524b7c`.

**Próximo passo:** testar no deploy da Vercel criar uma Flex, verificar com SIM/NÃO e confirmar a contagem; testar adicionar uma compra, arquivar e encontrá-la no Painel/Arquivados. Se algum INSERT direto pelo cliente for bloqueado por RLS, mover a operação para server action/API mantendo as mesmas regras.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Corrigir erro ao criar novo usuário no módulo Usuários.

**Diagnóstico:** A API `/api/usuarios` já exigia `username`, mas o formulário antigo não enviava esse campo.

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
