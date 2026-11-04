import { describe, expect, it } from "vitest";
import {
	buildCursorToolManifestText,
	CURSOR_TOOL_MANIFEST_ENV,
	resolveCursorToolManifestEnabled,
} from "../src/cursor-tool-manifest.js";

describe("cursor-tool-manifest", () => {
	it("builds manifest with bridge tools and host summary", () => {
		const text = buildCursorToolManifestText({
			piBridgeEnabled: true,
			bridgeSnapshot: {
				tools: [
					{
						piToolName: "cursor_ask_question",
						mcpToolName: "cursor_ask_question",
						description: "ask",
						inputSchema: { type: "object" },
						sourceInfo: { source: "extension", path: "test", scope: "temporary", origin: "top-level" },
					},
				],
				mcpToolNameToPiToolName: new Map([["cursor_ask_question", "cursor_ask_question"]]),
				piToolNameToMcpToolName: new Map([["cursor_ask_question", "cursor_ask_question"]]),
			},
		});

		expect(text).toContain("Callable tool surfaces this run:");
		expect(text).toContain("Cursor host/MCP");
		expect(text).toContain("Pi tool toggles affect pi tools/bridge exposure only");
		expect(text).toContain("cursor_ask_question");
		expect(text).toContain("cursor-replay-*");
	});

	it("omits bridge lines when pi bridge guidance is disabled", () => {
		const text = buildCursorToolManifestText({
			includePiBridgeGuidance: false,
			piBridgeEnabled: true,
			bridgeSnapshot: {
				tools: [
					{
						piToolName: "cursor_ask_question",
						mcpToolName: "cursor_ask_question",
						description: "ask",
						inputSchema: { type: "object" },
						sourceInfo: { source: "extension", path: "test", scope: "temporary", origin: "top-level" },
					},
				],
				mcpToolNameToPiToolName: new Map(),
				piToolNameToMcpToolName: new Map(),
			},
		});

		expect(text).toContain("Callable tool surfaces this run:");
		expect(text).toContain("Cursor host/MCP");
		expect(text).toContain("configured MCP depends on Cursor settings");
		expect(text).not.toContain("Pi bridge");
		expect(text).not.toContain("cursor_ask_question");
	});

	it("distinguishes disabled bridge from empty exposure", () => {
		const disabled = buildCursorToolManifestText({ piBridgeEnabled: false });
		const empty = buildCursorToolManifestText({ piBridgeEnabled: true, bridgeSnapshot: { tools: [], mcpToolNameToPiToolName: new Map(), piToolNameToMcpToolName: new Map() } });
		expect(disabled).toContain("Pi bridge: disabled");
		expect(disabled).not.toContain("SwitchMode");
		expect(empty).toContain("no Pi tools exposed");
	});

	it("describes MCP-only without advertising host tools", () => {
		const text = buildCursorToolManifestText({ nativeToolsEnabled: false });
		expect(text).toContain("Cursor native tools (including task/subagents): disabled");
		expect(text).toContain("configured MCP depends on Cursor settings");
		expect(text).not.toContain("read/shell/search/edit/write");
	});

	it("defaults manifest env to enabled", () => {
		expect(resolveCursorToolManifestEnabled({})).toBe(true);
		expect(resolveCursorToolManifestEnabled({ [CURSOR_TOOL_MANIFEST_ENV]: "0" })).toBe(false);
	});
});
