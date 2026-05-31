import path from "node:path";

const DEFAULT_MAX_TEXT_BYTES = 64 * 1024;

function unique(values) {
  return Array.from(new Set(values));
}

export function normalizeConfiguredRoots(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(
    value
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => path.resolve(item))
  );
}

export function normalizeConfig(pluginConfig) {
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

export function isPathWithinAllowedRoots(candidatePath, roots) {
  const resolvedCandidate = path.resolve(candidatePath);

  return roots.some((rootPath) => {
    const relativePath = path.relative(rootPath, resolvedCandidate);
    return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
  });
}

export function selectConfiguredRoot(roots, requestedRoot) {
  if (typeof requestedRoot === "string" && requestedRoot.trim()) {
    const resolvedRoot = path.resolve(requestedRoot);
    return roots.includes(resolvedRoot) ? resolvedRoot : null;
  }

  return roots.length === 1 ? roots[0] : null;
}

export function resolveRelativePathWithinRoot(rootPath, relativePath = ".") {
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

export function isUtf8Text(buffer) {
  const decoded = buffer.toString("utf8");
  return !decoded.includes("\u0000") && Buffer.from(decoded, "utf8").equals(buffer);
}

export { DEFAULT_MAX_TEXT_BYTES };
