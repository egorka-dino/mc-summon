import type React from "react";
import { ClerkRootProvider } from "../components/ClerkRootProvider";
import { isClerkConfigured } from "../server/clerk-config";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ClerkRootProvider enabled={isClerkConfigured()}>{children}</ClerkRootProvider>;
}
