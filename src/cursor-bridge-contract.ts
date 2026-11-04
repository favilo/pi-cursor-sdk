export const CURSOR_PI_BRIDGE_MCP_TOOL_PREFIX = "";
export const CURSOR_PI_BRIDGE_PREFERENCE_TEXT =
	"Use the exposed Pi tools by their listed names, schemas, and prompt guidelines; Cursor-configured MCP and Cursor-native subagents are unavailable unless explicitly enabled.";

function formatPromptGuidelines(promptGuidelines: readonly string[] | undefined): string | undefined {
	const guidelines = promptGuidelines?.map((guideline) => guideline.trim()).filter(Boolean) ?? [];
	if (guidelines.length === 0) return undefined;
	return ["Pi tool prompt guidelines:", ...guidelines.map((guideline) => `- ${guideline}`)].join("\n");
}

export function buildCursorPiBridgeMcpToolDescription(options: {
	piToolName: string;
	mcpToolName: string;
	piToolDescription: string;
	piToolPromptGuidelines?: readonly string[];
}): string {
	return [
		options.piToolDescription,
		formatPromptGuidelines(options.piToolPromptGuidelines),
		`Call tool ${options.mcpToolName}. Pi executes it as ${options.piToolName} through its normal tool and permission pipeline. Full tool-surface rules are in the session bootstrap prompt.`,
	].filter((line): line is string => line !== undefined).join("\n");
}
