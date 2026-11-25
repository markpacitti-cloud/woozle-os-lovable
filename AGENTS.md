<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project architecture rules

- **Staging Supabase API contract.** Connect directly to the external staging Supabase project in `src/lib/supabase.ts` via `@supabase/supabase-js` and route every read (`from`) and write (`rpc`) through `supabase.schema("api")`; do not enable Lovable Cloud, the Lovable Supabase integration, Lovable AI, or local SQL because the staging database owns all views, RPCs, RLS, and edge functions.
- **Staff shell and spaces.** Wrap `<Outlet />` in `AuthProvider`, `AuthGate`, and `AppShell` in `src/routes/__root.tsx`, deriving the active space from the URL (`/marketing/*`, `/admin/*`, else Sales) and rendering unbuilt sections through `$section` routes so every page shares authentication, navigation, global search, and the Ask Woozle panel.
