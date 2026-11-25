import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

export async function handleMcpRequest(
  request: Request,
  server: McpServer,
): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 64 * 1024,
    keepAliveMs: 0,
  });

  try {
    await server.connect(transport);

    return await transport.handleRequest(request);
  } catch (error) {
    console.error('MCP handler error:', error);

    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  } finally {
    await server.close();
  }
}
