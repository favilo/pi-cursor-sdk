# Cursor tool surfaces in pi

pi-cursor-sdk runs Cursor models through the local `@cursor/sdk` agent runtime by default. A local pi session can expose **three related but different** tool namespaces. This page is the user-facing guide; maintainer replay details live in [Cursor native tool replay](./cursor-native-tool-replay.md).

## The three surfaces

**Version boundary:** the MCP-only opt-out (`PI_CURSOR_NATIVE_TOOLS`) and `/cursor-abort` require **0.5.4 or later**, including [#372](https://github.com/fitchmultz/pi-cursor-sdk/pull/372). Published **0.5.3 ignores the flag and has no such command**. Verify the installed version before relying on these controls; a development version label alone does not prove availability.

| Surface | Who owns it | Callable by Cursor? | What pi shows |
| --- | --- | --- | --- |
| **Cursor SDK host tools** | Cursor local agent | No for local runs by default; enable with `PI_CURSOR_NATIVE_TOOLS=1` | Native replay cards (`read`, `bash`, …) or neutral Cursor activity. Representative ToolType list: [SDK ToolType replay matrix](./cursor-native-tool-replay.md#sdk-tooltype-replay-matrix). |
| **Configured Cursor MCP** | Cursor settings / `~/.cursor/mcp.json` | No by default; enable setting sources explicitly | Neutral **Cursor MCP** activity cards on replay |
| **Pi bridge (bare names)** | pi-cursor-sdk loopback MCP | Yes, when exposed | Real Pi tool names (`read`, `bash`, `activate_skill`, extension tools, …) |

Pi CLI tool toggles apply at the pi tool-registry boundary. `--no-tools`, `--tools`, and `--exclude-tools` can remove pi bridge exposure, but they do **not** disable Cursor SDK host tools or configured Cursor MCP servers.

**Not callable:** `cursor-replay-*` IDs in JSONL, Pi history tool names used only for display, and transcript labels. Cursor calls each exposed bridge tool by the same name Pi registered.

## Pi-owned local turns

Ordinary local runs default to SDK `AgentOptions.tools: ["mcp"]`, with ambient Cursor setting sources disabled. The bridge exposes active Pi tools, including overlapping built-ins, under bare Pi names. Every bridged call enters Pi's normal execution and hook boundary before the real tool runs.

```bash
# Default secure local surface.
pi --model cursor/grok-4.6

# Explicitly restore Cursor-owned local surfaces.
PI_CURSOR_NATIVE_TOOLS=1 PI_CURSOR_SETTING_SOURCES=all pi --model cursor/grok-4.6
```

Pi's active tool registry and hooks decide which bridged tools are available or blocked. `PI_CURSOR_EXPOSE_BUILTIN_TOOLS=0` hides overlapping Pi built-ins. Disabling the bridge leaves no Pi tools callable.

**MCP-only is not a sandbox.** Ambient Cursor MCP is absent by default, but enabling Cursor setting sources can add non-Pi MCP calls that bypass Pi's `tool_call` hooks. A permitted Pi or MCP tool can itself run a shell, access files/network, or delegate arbitrary work; this is no OS/process security boundary.

**Native replay cannot enforce a pre-execution policy.** Native Cursor work runs before its recorded result is replayed into Pi. Pi `tool_call` hooks may block a bridged Pi call before its real `execute()`, but blocking or rewriting native replay cannot prevent or transform the original Cursor command. `PI_CURSOR_NATIVE_TOOL_DISPLAY=0`, `PI_CURSOR_REGISTER_NATIVE_TOOLS=0`, Pi tool toggles, and `PI_CURSOR_PI_TOOL_BRIDGE=0` are not native execution controls. Use the SDK tool-surface opt-out rather than fabricated pre-execution callbacks.

The policy is captured before drain/acquisition and forwarded identically to create and resume (SDK tool restrictions are not persisted by Cursor). Opt-out agents have a distinct pooled/durable compatibility identity; defaults retain historical identity bytes. Changing policy replaces the agent at acquisition instead of reusing/resuming one with the opposite policy. Before draining a pending run, the provider checks its captured policy under the drain lease and rejects an opposite-policy continuation without delivering Pi results back to that SDK run. Ordinary mismatch does not cancel the old run: restore the prior policy to finish it, or invoke `/cursor-abort` to release the exact pending local run owned by this session before retrying. This command sends no model turn. If its owned run has an active Cursor Pi turn, it also invokes that turn's public abort before release; it does not abort a non-Cursor Pi turn or release sibling sessions or Cloud agents. Pi's normal abort only signals an active Pi turn; once the mismatch error has fully settled, idle Pi abort cannot reach that older Cursor waiter. Explicit active provider abort still releases its exact scoped pending run even when the signal was aborted before preparation. No recovery path undoes already-executed work. Fresh text-only LOCAL compaction/tree summary agents continue using `tools: []`, independently of this flag. Cloud with explicit native tools disabled fails before SDK creation or lifecycle side effects rather than silently ignoring the control.

## Discoverability

- **MCP `listTools`** lists MCP servers only — for example `pi_tools` with `activate_skill`. It does **not** enumerate disabled Cursor SDK host tools.
- **Bootstrap prompts** include a short **Cursor SDK tool boundary** block plus a compact **callable tool surfaces** manifest by default (disable with `PI_CURSOR_TOOL_MANIFEST=0`). When bridge tools are exposed, it lists their bare Pi names.
- **Incremental prompts** omit the full boundary block but keep a short tail guard (including an explicit shell `cd` hint); the session agent retains prior bootstrap context. They also omit invariant Pi system instructions; a changed system prompt forces bootstrap with the new section.
- **In-session debug:** `/cursor-tools` prints bridge/manifest enablement, effective `PI_CURSOR_SETTING_SOURCES`, and current-registry exposure eligibility, including the builtin-exposure setting. It is not a live-run catalog or health check.

## Diagnosing advertised but unused bridge tools

Enable `PI_CURSOR_PI_TOOL_BRIDGE_DEBUG=1` before the turn. The existing scrubbed stderr records correlate observations by safe run ID:

| Record | What it establishes |
| --- | --- |
| `run_created` / `tools_exposed` | Run exposure and pi↔MCP name mapping, not connection |
| `mcp_initialized` | Server receipt of validated `notifications/initialized` |
| `mcp_tools_list` | Catalog-handler output after request validation, with `toolCount` |
| `request_queued` / `request_resolved` / `request_rejected` | Actual bridge call handling |

Initialization/catalog receipts are server observations, not Cursor-client identity, response delivery, model consumption or ongoing health. Absence does not explain why no request occurred. `/cursor-tools` reflects the registry now, not an earlier run's captured surface; exposure alone is not invocation proof. These diagnostics do not enumerate Cursor-configured MCP connections. Do not share logs where tool names are sensitive; endpoint credentials and raw args/results are excluded.

For an advertised-but-unused `subagent`, first identify the active provider/version, then compare the run's exposure, initialization/catalog and call records with persisted Pi `toolCall`/`toolResult` rows. Bash-spawned Pi is not evidence of bridged `subagent` execution. The original Windows/two-provider report remains open in [#206](https://github.com/fitchmultz/pi-cursor-sdk/issues/206).

## Pi bridge vs Cursor native

Default behavior:

- Active Pi tools handle files, shell, search, edits, delegation, and extensions.
- The Pi bridge exposes active tools under their ordinary names when `PI_CURSOR_PI_TOOL_BRIDGE` is enabled.
- Overlapping Pi built-ins (`read`, `bash`, `write`, `edit`, `grep`, `find`, `ls`) are exposed unless `PI_CURSOR_EXPOSE_BUILTIN_TOOLS=0`.
- Cursor-native tools and ambient Cursor settings are explicit opt-ins.

`pi-cursor-sdk` can still register `cursor_ask_question` when `PI_CURSOR_ASK_QUESTION=1`. Its legacy `cursor_activate_skill` tool is inactive unless `PI_CURSOR_SKILL_TOOL=1`; a normal Pi extension tool such as `activate_skill` is preferred because Pi's permission policy governs it like every other tool.

```bash
# Enable Cursor's interactive question tool
PI_CURSOR_ASK_QUESTION=1 pi --model cursor/grok-4.6

# Disable pi bridge entirely
PI_CURSOR_PI_TOOL_BRIDGE=0 pi --model cursor/grok-4.6

# Hide overlapping Pi builtins from the bridge
PI_CURSOR_EXPOSE_BUILTIN_TOOLS=0 pi --model cursor/grok-4.6

# Fail a stranded bridge call sooner than the effective MCP tool timeout
PI_CURSOR_PI_BRIDGE_CALL_TIMEOUT_MS=120000 pi --model cursor/grok-4.6

# Announce the bridge URL as localhost and listen on a port or range (for example for a Cursor team MCP allowlist such as http://localhost:800*/mcp).
PI_CURSOR_PI_TOOL_BRIDGE_HOST=localhost PI_CURSOR_PI_TOOL_BRIDGE_PORT=8000-8009 pi --model cursor/grok-4.6

# Disable bootstrap tool manifest
PI_CURSOR_TOOL_MANIFEST=0 pi --model cursor/grok-4.6
```

For `localhost`, the bridge owns both `127.0.0.1` and `::1` on the selected port before advertising its URL; a conflict on either family skips the port, and missing IPv6 fails closed. The default remains IPv4-only. Host/port settings are captured for the shared server lifetime, not changed under active runs; dispose all its runs before changing them.

## Runtime and transport policy

Current defaults:

- Local runtime is the default.
- The pi bridge uses loopback MCP and is the sole implemented Pi-tool transport for local Cursor agents.
- SDK `local.customTools` remains deferred and needs SDK cancellation/deadline support before it can replace the loopback MCP bridge; no transport config is exposed.
- Explicit cloud runtime selection requires first-use acknowledgement (`/cursor-runtime cloud`, `/cursor-runtime cloud --save-user`, `--cursor-cloud-ack`, or `PI_CURSOR_CLOUD_ACK=1`) plus preflight. Project config may save a cloud runtime default but not the acknowledgement. Cloud runs use fresh context by default and do **not** get local pi tools through loopback MCP or `local.customTools`; cloud Pi-tool access would require a separate secure remote bridge and a new product decision.
- Inline cloud MCP is not exposed in the initial cloud runtime because live probes showed first-run/replacement/resume behavior was not deterministic enough.

## Cursor settings vs pi toggles

Disabling or removing an MCP server **only in pi** does not remove Cursor ambient MCP loaded from Cursor config.

| Control | Effect |
| --- | --- |
| `pi --no-tools` | Disables pi built-in/extension/custom tools and therefore removes pi bridge exposure; Cursor SDK host tools still remain callable. |
| `pi --tools ...` / `pi --exclude-tools ...` | Narrows pi's active tool registry and therefore the pi bridge snapshot; Cursor SDK host tools and configured Cursor MCP are unchanged. |
| `PI_CURSOR_NATIVE_TOOLS=0` | Local default: only MCP, including disabling native task/subagents. Explicit Cloud with this value fails closed. |
| `PI_CURSOR_NATIVE_TOOLS=1` | Enables Cursor-native host tools for local runs. |
| `PI_CURSOR_SETTING_SOURCES=none` | Local default: disables ambient Cursor settings and MCP. |
| `PI_CURSOR_SETTING_SOURCES=all` | Loads user/project Cursor MCP, plugins, and rules. |
| `PI_CURSOR_SETTING_SOURCES=project,plugins` | Narrows which layers load |
| Empty or edited `~/.cursor/mcp.json` | Changes which user MCP servers Cursor connects to |

The default local surface is the Pi bridge only. Opt into Cursor host tools or setting sources only when their bypass of Pi's permission pipeline is acceptable.

## JSONL ID patterns (debugging)

| ID prefix | Meaning |
| --- | --- |
| `cursor-replay-*` | Display-only replay of Cursor SDK activity |
| `cursor-pi-bridge-run-*` (run) / `cursor-pi-bridge-<32 hex>-t<counter>` (tool) | Live pi execution via bridge |

Example mistake: treating `cursor-replay-…` as a tool to invoke. Replay never re-runs work.

## Related docs

- [Reference — Cursor provider tool contract](reference.md#cursor-provider-tool-contract)
- [Cursor native tool replay](./cursor-native-tool-replay.md)
- [Cursor model UX spec](./cursor-model-ux-spec.md)
