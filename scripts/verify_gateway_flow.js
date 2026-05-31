import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function gatewayCall(method, params = undefined) {
  const args = ["gateway", "call", method, "--json"];
  if (params !== undefined) {
    args.push("--params", JSON.stringify(params));
  }

  const raw = execFileSync("openclaw", args, {
    encoding: "utf8",
    cwd: process.cwd()
  });

  return JSON.parse(raw);
}

const status = gatewayCall("filebrowser.status");
assert.equal(status.pluginId, "openclaw-filebrowser");
assert.equal(status.enabled, true);
assert.ok(Array.isArray(status.roots));
assert.ok(status.roots.includes("/root/.openclaw/workspace"));

const listing = gatewayCall("filebrowser.listDirectory", {
  root: "/root/.openclaw/workspace",
  path: "."
});
assert.equal(listing.root, "/root/.openclaw/workspace");
assert.ok(Array.isArray(listing.entries));
assert.ok(listing.entries.some((entry) => entry.name === "openclaw-filebrowser" && entry.type === "directory"));

const fileRead = gatewayCall("filebrowser.readTextFile", {
  root: "/root/.openclaw/workspace",
  path: "openclaw-filebrowser/STATUS.md"
});
assert.equal(fileRead.root, "/root/.openclaw/workspace");
assert.equal(fileRead.path, "openclaw-filebrowser/STATUS.md");
assert.ok(fileRead.content.includes("# OpenClaw File Browser Status"));

try {
  gatewayCall("filebrowser.listDirectory", {
    root: "/root/.openclaw/workspace",
    path: "../"
  });
  assert.fail("escape path should have been rejected");
} catch (error) {
  const text = String(error);
  assert.ok(
    text.includes("path must be relative and stay within the selected root") ||
      text.includes("path escapes the selected root"),
    `unexpected rejection message: ${text}`
  );
}

console.log("gateway_flow=ok");
