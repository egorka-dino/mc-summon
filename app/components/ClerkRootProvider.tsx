"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type React from "react";
import { clerkLocalization } from "./clerk-localization";

type Props = {
  children: React.ReactNode;
  enabled: boolean;
};

export function ClerkRootProvider({ children, enabled }: Props) {
  if (!enabled) {
    return <>{children}</>;
  }

  return <ClerkProvider localization={clerkLocalization}>{children}</ClerkProvider>;
}
