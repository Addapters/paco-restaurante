# Paco Restaurante

Aplicação web do restaurante Paco, construída com Next.js (App Router), TypeScript, Tailwind CSS, Supabase e next-intl.

## Áreas da aplicação

- **/cliente** — menu, reservas e pedidos
- **/staff** — gestão de pedidos e serviço de sala
- **/admin** — gestão do restaurante, menu e equipa

Cada área tem o seu próprio layout (`src/app/[locale]/<área>/layout.tsx`) e partilha os componentes de UI em `src/components/ui`.

## Tema (Tailwind v4 — definido em `src/app/globals.css`)

| Token | Cor | Uso |
| --- | --- | --- |
| `cream` | `#EFE8DE` | fundo (bege) |
| `terracotta` | `#D39F80` | destaque / CTA |
| `sage` | `#76907C` | secundária (verde salva) |
| `ink` | `#353D4D` | texto |
| `paper` / `charcoal` / `smoke` | branco / cinza escuro / cinza | neutros |

Usar como classes normais do Tailwind: `bg-cream`, `bg-terracotta`, `text-ink`, etc.

## Idiomas

Internacionalização com **next-intl**. Português é o idioma por defeito (sem prefixo no URL); inglês fica em `/en/...`. As traduções estão em `messages/pt.json` e `messages/en.json`.

## Supabase

Cria um projeto em [supabase.com](https://supabase.com) e preenche o `.env.local` (ver `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Clientes reutilizáveis:

- `src/lib/supabase/client.ts` — para Client Components
- `src/lib/supabase/server.ts` — para Server Components / Actions / Route Handlers

## Desenvolvimento

```bash
npm install
npm run dev
```

## Deploy (Vercel)

O projeto está pronto para deploy automático na Vercel: importa o repositório GitHub em [vercel.com/new](https://vercel.com/new) e define as variáveis de ambiente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` nas definições do projeto.
