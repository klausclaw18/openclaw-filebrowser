# Research Notes

## Confirmed OpenClaw-native seams

- The OpenClaw Plugin SDK exposes `api.session.controls.registerControlUiDescriptor(...)`.
- The `PluginControlUiDescriptor` type currently supports:
  - `id`
  - `surface`
  - `label`
  - `description`
  - `placement`
  - `schema`
  - `requiredScopes`
- The supported descriptor surfaces are:
  - `session`
  - `tool`
  - `run`
  - `settings`
- Plugins can expose HTTP endpoints through `api.registerHttpRoute(...)`.
- Plugins can expose Gateway RPC methods through `api.registerGatewayMethod(...)`.
- Official docs state that the Workboard plugin adds a tab to the Control UI, which strongly suggests that dashboard UI extension is supported through plugin-owned seams.

## Current hypothesis

The safest first version is likely:

1. Plugin-owned Gateway methods for listing directories and reading small files.
2. A plugin-owned HTTP route or UI descriptor-backed panel/view in the Control UI.
3. Read-only filesystem access limited to configured roots.
4. Optional future write actions only after the browsing surface is stable.

## Constraints to respect

- Do not patch OpenClaw core dashboard files directly.
- Do not assume unrestricted filesystem access from the UI.
- Keep paths normalized and rooted under an allowlisted workspace boundary.
- Treat this as an operator/admin surface, not a public browser.

## Open questions

- Whether a top-level nav tab is available to third-party plugins through the public SDK, or whether the public seam is narrower and better suited to session/settings surfaces.
- Whether the most OpenClaw-native v1 should rely on:
  - a dedicated Control UI contribution descriptor
  - a plugin-owned HTTP route rendered separately
  - or a hybrid of both
- Whether `oc-path` should be reused conceptually or remain separate as a CLI-oriented companion.
