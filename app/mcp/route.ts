// Temporary compatibility alias. The canonical furry-history endpoint is /furry/mcp;
// this root route remains available while the endpoint can grow into an aggregate MCP.
import { POST as handlePost } from "../furry/mcp/route";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  return handlePost(request);
}
