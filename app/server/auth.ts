import { currentUser } from "@clerk/nextjs/server";

type Metadata = Record<string, unknown>;

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  imageUrl: string | null;
  isAdmin: boolean;
} | null;

export function isClerkConfigured() {
  return (
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY)
  );
}

function asMetadata(value: unknown): Metadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Metadata;
}

function metadataHasAdminRole(metadata: Metadata) {
  const role = metadata.role;
  const roles = metadata.roles;

  return (
    role === "admin" ||
    metadata.admin === true ||
    (Array.isArray(roles) && roles.includes("admin"))
  );
}

export function isAdminFromMetadata(user: {
  publicMetadata?: unknown;
  privateMetadata?: unknown;
}) {
  return (
    metadataHasAdminRole(asMetadata(user.publicMetadata)) ||
    metadataHasAdminRole(asMetadata(user.privateMetadata))
  );
}

export async function getAuthUser(): Promise<AuthUser> {
  if (!isClerkConfigured()) {
    return null;
  }

  const user = await currentUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name:
      user.fullName ||
      user.primaryEmailAddress?.emailAddress ||
      user.username ||
      "Игрок",
    email: user.primaryEmailAddress?.emailAddress || null,
    imageUrl: user.imageUrl || null,
    isAdmin: isAdminFromMetadata(user),
  };
}
