# Minha vida financeira

Plataforma pessoal de controle financeiro — Next.js + Supabase.

## Rodando localmente

1. Instale as dependências:
   ```
   npm install
   ```

2. Crie um arquivo `.env.local` na raiz com:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://gglxkjjmhdiprnrodvub.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_-2euv5hWbN9F2pvs94KvGg_PRFlkPhL
   ```

3. Rode o servidor de desenvolvimento:
   ```
   npm run dev
   ```

4. Abra http://localhost:3000

## Deploy

Publicado via Vercel, conectado a este repositório. As variáveis de ambiente acima devem
ser configuradas em Project Settings → Environment Variables na Vercel.

## Estrutura

- `app/` — páginas (App Router)
- `components/app/` — componentes do aplicativo (Shell, formulários, etc.)
- `components/icons.tsx` — biblioteca de ícones SVG (sem emojis)
- `lib/supabase/` — clientes Supabase (browser, servidor)
- `lib/data/` — queries e Server Actions
- `proxy.ts` — middleware de sessão/autenticação
