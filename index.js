import { definePluginEntry } from "openclaw/plugin-sdk/core";
import { ErrorCodes, errorShape } from "openclaw/plugin-sdk/gateway-runtime";
import { Type } from "typebox";
import fs from "node:fs/promises";
import {
  isPathWithinAllowedRoots,
  isUtf8Text,
  normalizeConfig,
  resolveRelativePathWithinRoot,
  selectConfiguredRoot
} from "./gateway-paths.js";

const fileBrowserConfigSchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean()),
    roots: Type.Optional(Type.Array(Type.String())),
    maxTextBytes: Type.Optional(Type.Number())
  },
  {
    additionalProperties: false
  }
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

export default definePluginEntry({
  id: "openclaw-filebrowser",
  name: "OpenClaw File Browser",
  description: "Read-only file browser scaffold with explicit roots and verification-friendly status.",
  configSchema: fileBrowserConfigSchema,
  register(api) {
    const config = normalizeConfig(api.pluginConfig);

    api.session.controls.registerControlUiDescriptor({
      id: "openclaw-filebrowser-settings",
      surface: "settings",
      label: "File Browser",
      description: "Read-only file browser status and configured roots.",
      requiredScopes: ["operator.read"]
    });

    api.registerGatewayMethod(
      "filebrowser.status",
      ({ respond }) => {
        respond(true, {
          pluginId: "openclaw-filebrowser",
          enabled: config.enabled,
          roots: config.roots,
          surface: "settings",
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

    api.registerHttpRoute({
      path: "/plugin/openclaw-filebrowser",
      auth: "gateway",
      match: "exact",
      handler: (_req, res) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OpenClaw File Browser</title>
    <style>
      body { font-family: sans-serif; margin: 2rem; line-height: 1.5; }
      code { background: #f3f3f3; padding: 0.15rem 0.3rem; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>OpenClaw File Browser</h1>
    <p>This is the first scaffold for the read-only file browser plugin.</p>
    <p>Enabled: <code>${String(config.enabled)}</code></p>
    <p>Configured roots: <code>${config.roots.length}</code></p>
  </body>
</html>`);
        return true;
      }
    });
  }
});
