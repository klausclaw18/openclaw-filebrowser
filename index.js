import { definePluginEntry } from "openclaw/plugin-sdk/core";
import { ErrorCodes, errorShape } from "openclaw/plugin-sdk/gateway-runtime";
import { Type } from "typebox";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_MAX_TEXT_BYTES = 64 * 1024;

function unique(values) {
  return Array.from(new Set(values));
}

function normalizeConfiguredRoots(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return unique(
    value
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => path.resolve(item))
  );
}

function normalizeConfig(pluginConfig) {
  const config = pluginConfig && typeof pluginConfig === "object" ? pluginConfig : {};
  return {
    enabled: config.enabled !== false,
    roots: normalizeConfiguredRoots(config.roots),
    maxTextBytes:
      Number.isInteger(config.maxTextBytes) && config.maxTextBytes > 0
        ? config.maxTextBytes
        : DEFAULT_MAX_TEXT_BYTES
  };
}

function isPathWithinAllowedRoots(candidatePath, roots) {
  const resolvedCandidate = path.resolve(candidatePath);
  return roots.some((rootPath) => {
    const relativePath = path.relative(rootPath, resolvedCandidate);
    return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
  });
}

function selectConfiguredRoot(roots, requestedRoot) {
  if (typeof requestedRoot === "string" && requestedRoot.trim()) {
    const resolvedRoot = path.resolve(requestedRoot);
    return roots.includes(resolvedRoot) ? resolvedRoot : null;
  }
  return roots.length === 1 ? roots[0] : null;
}

function resolveRelativePathWithinRoot(rootPath, relativePath = ".") {
  if (typeof relativePath !== "string") {
    return null;
  }
  const requestedPath = relativePath.trim() ? relativePath : ".";
  if (path.isAbsolute(requestedPath)) {
    return null;
  }
  const candidatePath = path.resolve(rootPath, requestedPath);
  return isPathWithinAllowedRoots(candidatePath, [rootPath]) ? candidatePath : null;
}

function isUtf8Text(buffer) {
  const decoded = buffer.toString("utf8");
  return !decoded.includes("\u0000") && Buffer.from(decoded, "utf8").equals(buffer);
}

const fileBrowserConfigSchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean()),
    roots: Type.Optional(Type.Array(Type.String())),
    maxTextBytes: Type.Optional(Type.Number())
  },
  { additionalProperties: false }
);

function normalizePathParam(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

function invalidRequest(message) {
  return errorShape(ErrorCodes.INVALID_REQUEST, message);
}

function forbidden(message) {
  return errorShape(ErrorCodes.FORBIDDEN ?? ErrorCodes.INVALID_REQUEST, message);
}

async function realpathWithinRoot(rootPath, candidatePath) {
  const [realRoot, realCandidate] = await Promise.all([
    fs.realpath(rootPath),
    fs.realpath(candidatePath)
  ]);
  return isPathWithinAllowedRoots(realCandidate, [realRoot]) ? realCandidate : null;
}

function getRootAndCandidate(params, config) {
  const rootPath = selectConfiguredRoot(config.roots, params?.root);
  if (!rootPath) {
    return { error: invalidRequest("root is required when zero or multiple roots are configured") };
  }
  const candidatePath = resolveRelativePathWithinRoot(rootPath, params?.path ?? ".");
  if (!candidatePath) {
    return { error: forbidden("path must be relative and stay within the selected root") };
  }
  return { rootPath, candidatePath };
}

// ---------- EMBEDDED UI HTML ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UI_HTML_PATH = path.resolve(__dirname, "filebrowser-ui.html");

// ---------- PLUGIN ENTRY ----------
export default definePluginEntry({
  id: "openclaw-filebrowser",
  name: "OpenClaw File Browser",
  description: "Read-only file browser with interactive Control UI dashboard.",
  configSchema: fileBrowserConfigSchema,
  register(api) {
    const config = normalizeConfig(api.pluginConfig);

    // Control UI descriptor — settings-surface placeholder
    api.session.controls.registerControlUiDescriptor({
      id: "openclaw-filebrowser-settings",
      surface: "settings",
      label: "File Browser",
      description: "Read-only file browser status and configured roots.",
      requiredScopes: ["operator.read"]
    });

    // Gateway RPC — internal agent methods (unchanged)
    api.registerGatewayMethod(
      "filebrowser.status",
      ({ respond }) => {
        respond(true, {
          pluginId: "openclaw-filebrowser",
          enabled: config.enabled,
          roots: config.roots,
          maxTextBytes: config.maxTextBytes,
          capabilities: ["status", "roots", "listDirectory", "readTextFile"]
        });
      },
      { scope: "operator.read" }
    );

    api.registerGatewayMethod(
      "filebrowser.checkPath",
      ({ params, respond }) => {
        const requestedPath = normalizePathParam(params?.path);
        if (!requestedPath) {
          respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "path is required"));
          return;
        }
        respond(true, {
          requestedPath,
          withinAllowedRoots: isPathWithinAllowedRoots(requestedPath, config.roots),
          roots: config.roots
        });
      },
      { scope: "operator.read" }
    );

    api.registerGatewayMethod(
      "filebrowser.listDirectory",
      async ({ params, respond }) => {
        if (!config.enabled) {
          respond(false, undefined, forbidden("file browser is disabled"));
          return;
        }
        const { rootPath, candidatePath, error } = getRootAndCandidate(params, config);
        if (error) {
          respond(false, undefined, error);
          return;
        }
        try {
          const realCandidate = await realpathWithinRoot(rootPath, candidatePath);
          if (!realCandidate) {
            respond(false, undefined, forbidden("path escapes the selected root"));
            return;
          }
          const entries = await fs.readdir(realCandidate, { withFileTypes: true });
          respond(true, {
            root: rootPath,
            path: params?.path ?? ".",
            entries: entries.map((entry) => ({
              name: entry.name,
              type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other"
            }))
          });
        } catch (errorValue) {
          respond(false, undefined, invalidRequest(errorValue.message));
        }
      },
      { scope: "operator.read" }
    );

    api.registerGatewayMethod(
      "filebrowser.readTextFile",
      async ({ params, respond }) => {
        if (!config.enabled) {
          respond(false, undefined, forbidden("file browser is disabled"));
          return;
        }
        const { rootPath, candidatePath, error } = getRootAndCandidate(params, config);
        if (error) {
          respond(false, undefined, error);
          return;
        }
        try {
          const realCandidate = await realpathWithinRoot(rootPath, candidatePath);
          if (!realCandidate) {
            respond(false, undefined, forbidden("path escapes the selected root"));
            return;
          }
          const stat = await fs.stat(realCandidate);
          if (!stat.isFile()) {
            respond(false, undefined, invalidRequest("path must refer to a file"));
            return;
          }
          if (stat.size > config.maxTextBytes) {
            respond(false, undefined, invalidRequest("file exceeds configured text read limit"));
            return;
          }
          const content = await fs.readFile(realCandidate);
          if (content.length > config.maxTextBytes) {
            respond(false, undefined, invalidRequest("file exceeds configured text read limit"));
            return;
          }
          if (!isUtf8Text(content)) {
            respond(false, undefined, invalidRequest("file is not valid UTF-8 text"));
            return;
          }
          respond(true, {
            root: rootPath,
            path: params?.path ?? ".",
            bytes: content.length,
            content: content.toString("utf8")
          });
        } catch (errorValue) {
          respond(false, undefined, invalidRequest(errorValue.message));
        }
      },
      { scope: "operator.read" }
    );

    // HTTP API routes for the interactive SPA
    function serveJson(res, statusCode, data) {
      const body = JSON.stringify(data);
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(body);
    }

    // /api/status
    api.registerHttpRoute({
      path: "/plugin/openclaw-filebrowser/api/status",
      auth: "gateway",
      match: "exact",
      handler: (_req, res) => {
        serveJson(res, 200, {
          pluginId: "openclaw-filebrowser",
          enabled: config.enabled,
          roots: config.roots,
          maxTextBytes: config.maxTextBytes,
          capabilities: ["status", "listDirectory", "readFile"]
        });
        return true;
      }
    });

    // /api/list?root=<path>&path=<dir>
    api.registerHttpRoute({
      path: "/plugin/openclaw-filebrowser/api/list",
      auth: "gateway",
      match: "exact",
      handler: async (req, res) => {
        const url = new URL(req.url, "http://localhost");
        const rootParam = url.searchParams.get("root") || config.roots[0];
        const dirParam = url.searchParams.get("path") || ".";
        const rootPath = selectConfiguredRoot(config.roots, rootParam);

        if (!rootPath) {
          serveJson(res, 400, { error: "Invalid root" });
          return true;
        }

        const candidatePath = resolveRelativePathWithinRoot(rootPath, dirParam);
        if (!candidatePath) {
          serveJson(res, 400, { error: "Path must stay within the configured root" });
          return true;
        }

        try {
          const realCandidate = await realpathWithinRoot(rootPath, candidatePath);
          if (!realCandidate) {
            serveJson(res, 403, { error: "Path escapes the selected root" });
            return true;
          }

          const entries = await fs.readdir(realCandidate, { withFileTypes: true });
          const dirEntries = await Promise.all(entries.map(async (entry) => {
            let size = 0;
            try {
              if (entry.isFile()) {
                const s = await fs.stat(path.join(realCandidate, entry.name));
                size = s.size;
              }
            } catch (_) {}
            return {
              name: entry.name,
              type: entry.isDirectory() ? "directory" : "file",
              size: size || undefined
            };
          }));

          serveJson(res, 200, {
            root: rootPath,
            path: dirParam,
            entries: dirEntries
          });
        } catch (err) {
          serveJson(res, 500, { error: err.message });
        }
        return true;
      }
    });

    // /api/read?root=<path>&path=<file>
    api.registerHttpRoute({
      path: "/plugin/openclaw-filebrowser/api/read",
      auth: "gateway",
      match: "exact",
      handler: async (req, res) => {
        const url = new URL(req.url, "http://localhost");
        const rootParam = url.searchParams.get("root") || config.roots[0];
        const fileParam = url.searchParams.get("path") || ".";
        const rootPath = selectConfiguredRoot(config.roots, rootParam);

        if (!rootPath) {
          serveJson(res, 400, { error: "Invalid root" });
          return true;
        }

        const candidatePath = resolveRelativePathWithinRoot(rootPath, fileParam);
        if (!candidatePath) {
          serveJson(res, 400, { error: "Path must stay within the configured root" });
          return true;
        }

        try {
          const realCandidate = await realpathWithinRoot(rootPath, candidatePath);
          if (!realCandidate) {
            serveJson(res, 403, { error: "Path escapes the selected root" });
            return true;
          }

          const stat = await fs.stat(realCandidate);
          if (!stat.isFile()) {
            serveJson(res, 400, { error: "Path must refer to a file" });
            return true;
          }

          if (stat.size > config.maxTextBytes) {
            serveJson(res, 413, { error: "File exceeds configured read limit" });
            return true;
          }

          const buffer = await fs.readFile(realCandidate);
          if (!isUtf8Text(buffer)) {
            serveJson(res, 400, { error: "File is not valid UTF-8 text" });
            return true;
          }

          serveJson(res, 200, {
            root: rootPath,
            path: fileParam,
            bytes: buffer.length,
            content: buffer.toString("utf8")
          });
        } catch (err) {
          serveJson(res, 500, { error: err.message });
        }
        return true;
      }
    });

    // Serves the interactive HTML file browser SPA
    let cachedUi = null;
    api.registerHttpRoute({
      path: "/plugin/openclaw-filebrowser",
      auth: "gateway",
      match: "exact",
      handler: async (_req, res) => {
        try {
          if (!cachedUi) {
            cachedUi = await fs.readFile(UI_HTML_PATH, "utf8");
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.end(cachedUi);
        } catch (_) {
          // Fallback on read error
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><title>OpenClaw File Browser</title></head>
<body><h1>📁 File Browser</h1><p>Enabled: ${config.enabled}</p><p>Roots: ${config.roots.length}</p></body></html>`);
        }
        return true;
      }
    });
  }
});