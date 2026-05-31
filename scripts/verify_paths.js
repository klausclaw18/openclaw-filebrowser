import assert from "node:assert/strict";
import path from "node:path";
import {
  isPathWithinAllowedRoots,
  normalizeConfig,
  resolveRelativePathWithinRoot,
  selectConfiguredRoot
} from "../gateway-paths.js";

const root = path.resolve("fixtures/root");
const otherRoot = path.resolve("fixtures/other");
const config = normalizeConfig({ roots: [root, root, otherRoot], maxTextBytes: 128 });

assert.deepEqual(config.roots, [root, otherRoot]);
assert.equal(config.maxTextBytes, 128);
assert.equal(selectConfiguredRoot([root], undefined), root);
assert.equal(selectConfiguredRoot(config.roots, root), root);
assert.equal(selectConfiguredRoot(config.roots, "/not/configured"), null);
assert.equal(resolveRelativePathWithinRoot(root, "notes/readme.txt"), path.join(root, "notes/readme.txt"));
assert.equal(resolveRelativePathWithinRoot(root, "../escape.txt"), null);
assert.equal(resolveRelativePathWithinRoot(root, path.resolve("absolute.txt")), null);
assert.equal(isPathWithinAllowedRoots(path.join(root, "child"), [root]), true);
assert.equal(isPathWithinAllowedRoots(path.join(root, "..", "escape"), [root]), false);

console.log("path_logic=ok");
