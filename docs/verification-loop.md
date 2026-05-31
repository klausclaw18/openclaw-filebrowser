# Verification Loop

This project should not rely on "it looks busy" as a proxy for progress.

## Core rule

Every work session must be checkable from the outside.

## What counts as progress

- A new or changed file exists.
- A build completed.
- A test passed or failed.
- A runtime behavior can be observed.
- A plugin install/load state can be checked.

## What does not count as progress by itself

- A long-running background process.
- A CLI tool thinking for a while.
- Research that was not written down.
- A claim that code was generated when the repository did not change.

## Session checkpoint questions

At each checkpoint, answer:

1. What changed since the last checkpoint?
2. What is verified right now?
3. What is still unverified or blocked?
4. What is the next concrete recovery or execution step?

## Recovery rule

If work appears stuck:

1. Check whether files changed.
2. Check whether a process is still alive.
3. Check whether the process produced output that maps to real progress.
4. If not, stop relying on the process and continue with direct, observable work.

## Automation rule

The loop should not be passive.

On every scheduled run:

1. Verify the current state.
2. State plainly whether the work is blocked, in progress, or done.
3. If the work is not done, continue with the next direct implementation or recovery step.
4. Do not treat a status report as the end of the run when an obvious next action exists.
5. Only let the loop go quiet once the plugin is implemented, installed, and verified in OpenClaw.

## Project-specific done ladder

Research is done when:
- The confirmed public seams are written down.
- The unsupported or risky seams are written down.

Implementation is done when:
- Real plugin files exist.
- The plugin builds.
- The core read-only flows work.

Installation is done when:
- OpenClaw shows the plugin as installed/loaded.
- The UI surface is visible or otherwise verifiably registered.
- Happy-path and rejection-path checks both pass.
