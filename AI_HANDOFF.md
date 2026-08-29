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

**Tarefa:** Corrigir erro ao criar novo usuário no módulo Usuários.

**Diagnóstico:** A API `/api/usuarios` já exigia `username`, mas o formulário antigo não enviava esse campo. Por isso, mesmo com nome, e-mail, senha e módulos preenchidos na tela, a API respondia que faltavam dados.

**Alterações:**
- `components/app/UsuariosClient.tsx`: adicionado campo visível **Nome de usuário** no cadastro e o valor passou a ser enviado à API.
- `app/api/usuarios/route.ts`: o backend agora também aceita criação sem username explícito, gerando um username válido a partir do nome. Isso mantém compatibilidade com clientes antigos.
- O username é normalizado e continua sendo usado pelo login de usuário ou e-mail.
- O Supabase Auth cria a conta com e-mail/senha e o perfil recebe o username e os módulos escolhidos.

**Commits:** `0740846` e `3998bdb`.

**Próximo passo:** Testar criar Anna no módulo Usuários. Exemplo: Nome `Anna`, usuário `anna`, e-mail, senha e módulo Atividades. Depois testar login com `anna` e também com o e-mail.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Melhorar a tipografia do app para uma aparência mais premium/fintech.

**Alterações:**
- `app/layout.tsx`: adicionada a fonte Inter via `next/font/google`, com carregamento otimizado e variável CSS `--font-inter`.
- `app/globals.css`: Inter passou a ser a fonte padrão global, inclusive no tema Tailwind e em botões, inputs, textareas e selects.
- Mantidos os estilos e cores existentes; a mudança é tipográfica.

**Commits:** `92609d3` e `326f814`.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Corrigir duplicidade de membro na lista "Atribuir a".

**Diagnóstico:** O Supabase tinha dois perfis chamados Dayan na mesma casa: o perfil antigo e o perfil do login atual. O perfil atual é o mais recente.

**Alteração:**
- Atualizado `lib/data/household-queries.ts` para deduplicar perfis com o mesmo nome e priorizar o mais recente.
- A lista de "Atribuir a" passa a mostrar apenas um Dayan.

**Commit:** `800525a5fc02660ed1ca8568eb7a072a0dbd81c1`.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Corrigir feedback visual dos botões de módulos e reduzir a sensação de atraso na navegação.

**Alterações:**
- Atualizado `components/app/Launcher.tsx`.
- Adicionado feedback de hover no PC e pressionamento no PC/celular.
- Adicionado foco visível para teclado.
- Adicionado estado de navegação com spinner, evitando duplo clique.

**Próximo passo:** Se o atraso continuar antes do clique, investigar o carregamento do perfil/Supabase.

---

## 2026-08-28 — ChatGPT

**Tarefa:** Implantação do protocolo de colaboração Claude ↔ ChatGPT.

**Alterações:**
- Atualizado `AGENTS.md` com protocolo obrigatório de handoff entre os agentes.
- Criado `AI_HANDOFF.md` como registro compartilhado.
- `CLAUDE.md` já aponta para `AGENTS.md`, portanto as regras compartilhadas passam a valer também para Claude.
