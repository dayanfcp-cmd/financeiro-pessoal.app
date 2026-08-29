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

**Tarefa:** Melhorar a tipografia do app para uma aparência mais premium/fintech.

**Alterações:**
- `app/layout.tsx`: adicionada a fonte Inter via `next/font/google`, com carregamento otimizado e variável CSS `--font-inter`.
- `app/globals.css`: Inter passou a ser a fonte padrão global, inclusive no tema Tailwind e em botões, inputs, textareas e selects.
- Mantidos os estilos e cores existentes; a mudança é tipográfica.
- Adicionados recursos de OpenType da Inter para uma aparência mais refinada em textos de interface.

**Motivo:** Inter tem excelente legibilidade em números, tabelas, saldos e interfaces densas e é uma escolha adequada para transmitir estética de aplicativo financeiro/bancário moderno.

**Commits:** `92609d3` e `326f814`.

**Próximo passo:** Conferir o deploy da Vercel em PC e celular. Se a fonte não carregar em algum ambiente, investigar o build/`next/font`, sem voltar automaticamente para a fonte anterior.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Corrigir duplicidade de membro na lista "Atribuir a".

**Diagnóstico:** O Supabase tinha dois perfis chamados Dayan na mesma casa: o perfil antigo e o perfil do login atual. O perfil atual é o mais recente. Não havia registros de atividades/compras vinculados ao perfil antigo nas colunas com FK para `profiles`, mas a ferramenta disponível não permitiu excluir o perfil antigo diretamente.

**Alteração:**
- Atualizado `lib/data/household-queries.ts`.
- `getMembrosDaCasa()` agora ordena por papel e, em caso de empate, pelo `created_at` mais recente.
- Perfis com o mesmo nome, ignorando maiúsculas/minúsculas e espaços, são deduplicados.
- O perfil mais recente é mantido. Assim, a lista de "Atribuir a" mostra apenas um Dayan e prioriza o perfil atual.

**Commit:** `800525a5fc02660ed1ca8568eb7a072a0dbd81c1`

**Observação:** A correção é de aplicação e não apaga o perfil antigo do Supabase. Se futuramente houver uma operação administrativa segura para excluir o perfil antigo, ele pode ser removido depois de nova verificação das dependências.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Corrigir feedback visual dos botões de módulos e reduzir a sensação de atraso na navegação.

**Alterações:**
- Atualizado `components/app/Launcher.tsx`.
- Os cards de Financeiro, Atividades e Usuários continuam sendo botões reais e agora têm `cursor-pointer` e `touch-manipulation`.
- Adicionado feedback de hover no PC.
- Adicionado feedback de pressionamento (`active:scale`) no PC e celular.
- Adicionado foco visível para teclado.
- Adicionado estado de navegação com `useTransition`.
- Enquanto a rota abre, o botão mostra spinner e fica temporariamente desabilitado, evitando duplo clique e deixando claro que o toque foi recebido.

**Observação:** A alteração foi feita apenas na interface/navegação do launcher; não altera regras de acesso nem dados do Supabase.

**Próximo passo:** Verificar no deploy da Vercel em PC e celular. Se o atraso continuar perceptível antes mesmo do clique (durante o carregamento inicial do launcher), investigar o `getMeuPerfil()`/consultas do Supabase em vez de mascarar com animação.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Implantação do protocolo de colaboração Claude ↔ ChatGPT.

**Alterações:**
- Atualizado `AGENTS.md` com protocolo obrigatório de handoff entre os agentes.
- Criado `AI_HANDOFF.md` como registro compartilhado.
- `CLAUDE.md` já aponta para `AGENTS.md`, portanto as regras compartilhadas passam a valer também para Claude.

**Próximo passo:**
- Nas próximas tarefas, cada agente deve ler este arquivo antes de trabalhar e deixar uma nota ao finalizar.
