import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { furryHistoryToolDefinitions, furryHistoryToolHandlers } from "@/lib/furry-history-mcp";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const server = new Server(
    { name: "history-thearcades-furry", version: "1.0.0" },
    {
      capabilities: { tools: {} },
      instructions: "Search before fetch. Preserve claim confidence and the distinction between fandom participation and external influence. The feedback tool prepares a review packet; it does not send, store, or publish feedback.",
    },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: furryHistoryToolDefinitions }));
  server.setRequestHandler(CallToolRequestSchema, async (call) => {
    const handler = furryHistoryToolHandlers[call.params.name];
    if (!handler) return { content: [{ type: "text" as const, text: `Unknown tool: ${call.params.name}` }], isError: true };
    try {
      return await handler(call.params.arguments ?? {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown tool error.";
      return { content: [{ type: "text" as const, text: message }], isError: true };
    }
  });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(request);
}
