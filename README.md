# OpenClaw File Browser

An OpenClaw-native file browser plugin for the Gateway dashboard.

## Goal

Add a simple, safe, OpenClaw-style file browser to the Gateway Control UI without patching OpenClaw core directly.

## Principles

- Stay as close as possible to official OpenClaw plugin seams.
- Prefer plugin-owned UI contributions over core dashboard modifications.
- Keep file access scoped and explicit.
- Default to read-only behavior first.
- Make installation and updates survive normal OpenClaw upgrades.

## Intended workflow

1. Research the Plugin SDK and Control UI contribution seams.
2. Build the plugin in this repository.
3. Use Codex CLI for implementation work where possible.
4. Review and iterate until the plugin matches OpenClaw best practices.
5. Install it into the local OpenClaw instance through the most official supported route.
6. Verify runtime registration before claiming UI-level progress.

## Tracking

- Linear project: `OpenClaw File Browser Plugin`
- Initial issues:
  - `POP-8` Research OpenClaw Plugin SDK seams for a native dashboard file browser
  - `POP-9` Implement first OpenClaw-native file browser plugin with Codex CLI
  - `POP-10` Install and verify the file browser plugin in the local OpenClaw instance
  - `POP-12` Create a verifiable progress loop for the OpenClaw file browser plugin work

## Verification loop

Before claiming progress on this project, verify:

1. What changed in files, build output, or runtime behavior?
2. What is actually verified, rather than assumed?
3. If a process is running, is it producing measurable output?
4. If work stalled, what is the exact next recovery step?

Current rule:

- For this plugin, `dist/` is not the main proof of progress.
- A stronger milestone is: installed plugin, loaded runtime, registered gateway methods, and then a visibly usable dashboard surface.

See [docs/verification-loop.md](docs/verification-loop.md) for the stricter working rules.
