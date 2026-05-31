# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [1.1.0] - 2026-05-31

### Added

- Interactive web file browser UI (served at `/plugin/openclaw-filebrowser`)
- Three HTTP API endpoints serving JSON with browser auth:
  - `.../api/status` — plugin status and configuration
  - `.../api/list?root=...&path=...`  — directory listing
  - `.../api/read?root=...&path=...` — file content read
- Embedded file browser frontend (single-page JavaScript web application)

### Changed

- REST API replaces Gateway RPC for HTTP routes (new dedicated HTTP handlers)
- Improved path resolution using CommonJS-safe ESM pattern

## [1.0.0] - 2026-05-31

### Added

- Initial OpenClaw file browser plugin release
- Read-only gateway methods for status, directory listing, and UTF-8 text file reads
- Explicit root allowlisting and path traversal protection
- Runtime registration of a plugin-owned control UI descriptor
- Verification scripts for path logic, runtime registration, gateway happy-path checks, and rejection-path checks
- Operational status and verification-loop documentation

### Security

- Enforced root-bound path resolution
- Realpath validation to prevent symlink escapes
- Rejection of non-UTF-8 and oversized text file reads

