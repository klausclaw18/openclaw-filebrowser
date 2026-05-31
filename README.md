# OpenClaw File Browser

Read-only file browser plugin for OpenClaw Gateway.

This plugin adds a safe, verifiable file-browsing surface to OpenClaw without patching core. It exposes a small read-only gateway API, registers a plugin-owned UI descriptor for the Gateway control surface, and keeps access constrained to explicitly configured root directories.

## Highlights

- Read-only by design
- Explicit allowlisted roots
- Path traversal protection
- UTF-8 text read limits
- Runtime and gateway verification scripts
- OpenClaw-native plugin registration

## Why

OpenClaw operators sometimes need lightweight visibility into workspace files directly from the Gateway environment. This project provides that visibility while keeping the trust model narrow:

- no write operations
- no implicit filesystem access
- no core OpenClaw patches
- no hidden install-time behavior

## Features

- `filebrowser.status`
  - reports plugin status, configured roots, and supported capabilities
- `filebrowser.listDirectory`
  - lists entries within an approved root
- `filebrowser.readTextFile`
  - reads UTF-8 text files within configured limits
- `filebrowser.checkPath`
  - debug-oriented path containment check
- plugin-owned control UI descriptor
  - registers a settings-surface entry for control-plane visibility

## Security Model

The plugin is intentionally conservative.

- Filesystem access is disabled unless the plugin is enabled.
- Every request must resolve inside a configured root.
- Absolute paths are rejected for relative file operations.
- Symlink escapes are blocked by realpath validation.
- Only UTF-8 text files can be read.
- Large files are rejected using a configurable byte limit.

## Installation

1. Clone the repository.
2. Install dependencies.
3. Link or install the plugin into your OpenClaw instance using your normal plugin workflow.
4. Configure one or more allowed roots.
5. Run the verification scripts before relying on the plugin in production.

```bash
npm install
./scripts/verify_progress.sh
```

## Configuration

The plugin manifest is [`openclaw.plugin.json`](openclaw.plugin.json), and the runtime configuration supports:

```json
{
  "enabled": true,
  "roots": [
    "/root/.openclaw/workspace"
  ],
  "maxTextBytes": 65536
}
```

### Fields

- `enabled`
  - enables or disables the plugin at runtime
- `roots`
  - absolute root directories the plugin may read from
- `maxTextBytes`
  - maximum size of a readable UTF-8 text file

## Gateway API

Examples assume the plugin is installed and the OpenClaw CLI can reach the local gateway runtime.

### Status

```bash
openclaw gateway call filebrowser.status --json
```

### List a directory

```bash
openclaw gateway call filebrowser.listDirectory \
  --params '{"root":"/root/.openclaw/workspace","path":"."}' \
  --json
```

### Read a text file

```bash
openclaw gateway call filebrowser.readTextFile \
  --params '{"root":"/root/.openclaw/workspace","path":"openclaw-filebrowser/README.md"}' \
  --json
```

## Verification

This repository ships with verification scripts that check path safety, plugin registration, and real gateway behavior.

```bash
node scripts/verify_paths.js
node scripts/verify_runtime.js
node scripts/verify_gateway_flow.js
./scripts/verify_progress.sh
```

The strongest completion signal is not just “files exist”, but:

- the plugin is installed
- the runtime loads it
- gateway methods are registered
- the control UI descriptor is registered
- happy-path and rejection-path checks pass

See [`STATUS.md`](STATUS.md) and [`docs/verification-loop.md`](docs/verification-loop.md) for the operational verification model used during development.

## Project Structure

```text
.
├── docs/
├── gateway-paths.js
├── index.js
├── openclaw.plugin.json
├── package.json
├── scripts/
├── STATUS.md
└── README.md
```

## Development

This project keeps the implementation intentionally small and inspectable. Changes should preserve:

- read-only behavior
- explicit root scoping
- OpenClaw-native extension seams
- verifiable runtime behavior

If you extend the plugin, keep verification in lockstep with capability changes.

## Roadmap

- richer plugin-owned UI beyond the current settings/control registration
- better file metadata presentation
- optional pagination or chunking for large directory listings
- optional syntax-aware text preview layer

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md).

## License

MIT. See [`LICENSE`](LICENSE).
