import { describe, expect, it } from "vitest";
import { resolveCursorNativeToolsEnabled } from "../src/cursor-native-tools.js";

describe("native tool surface environment", () => {
	it.each([undefined, "", "  ", "unknown", "0", "false", " OFF ", "none", "no", "disabled"])("defaults to Pi-owned MCP-only execution for %s", value => {
		expect(resolveCursorNativeToolsEnabled({ PI_CURSOR_NATIVE_TOOLS: value })).toBe(false);
	});
	it.each(["1", "TRUE", "on", "yes", "enabled"])("explicitly enables Cursor native tools for %s", value => {
		expect(resolveCursorNativeToolsEnabled({ PI_CURSOR_NATIVE_TOOLS: value })).toBe(true);
	});
});
