import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const raw = execFileSync(
  "openclaw",
  ["plugins", "inspect", "openclaw-filebrowser", "--json", "--runtime"],
  {
    encoding: "utf8",
    cwd: process.cwd()
  }
);

const payload = JSON.parse(raw);

assert.equal(payload?.plugin?.id, "openclaw-filebrowser");
assert.equal(payload?.plugin?.status, "loaded");
assert.equal(payload?.plugin?.enabled, true);
assert.ok(Array.isArray(payload?.gatewayMethods));
assert.ok(payload.gatewayMethods.includes("filebrowser.status"));
assert.ok(payload.gatewayMethods.includes("filebrowser.listDirectory"));
assert.ok(payload.gatewayMethods.includes("filebrowser.readTextFile"));
assert.ok((payload?.httpRouteCount ?? 0) >= 1);

const descriptorsRaw = execFileSync(
  "openclaw",
  ["gateway", "call", "plugins.uiDescriptors", "--json"],
  {
    encoding: "utf8",
    cwd: process.cwd()
  }
);

const descriptorsPayload = JSON.parse(descriptorsRaw);
assert.equal(descriptorsPayload?.ok, true);
assert.ok(Array.isArray(descriptorsPayload?.descriptors));
assert.ok(
  descriptorsPayload.descriptors.some(
    (descriptor) =>
      descriptor?.pluginId === "openclaw-filebrowser" &&
      descriptor?.id === "openclaw-filebrowser-settings" &&
      descriptor?.surface === "tool" &&
      descriptor?.path === "/plugin/openclaw-filebrowser"
  )
);

console.log("runtime_registration=ok");
