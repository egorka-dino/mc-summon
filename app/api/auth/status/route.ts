import { getAuthUser, isClerkConfigured } from "../../../server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isClerkConfigured();
  const user = await getAuthUser();

  return Response.json({
    provider: "clerk",
    configured,
    authenticated: Boolean(user),
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.imageUrl,
          isAdmin: user.isAdmin,
        }
      : null,
  });
}
