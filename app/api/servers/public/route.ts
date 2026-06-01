import { listPublishedExarotonServers } from "../../../server/exaroton-publications";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await listPublishedExarotonServers();
  return Response.json({
    ok: result.ok,
    configured: result.configured,
    error: result.error,
    servers: result.servers.map((server) => ({
      id: server.id,
      name: server.name,
      address: server.address,
    })),
  });
}
