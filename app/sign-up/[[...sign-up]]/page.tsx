import { ClerkProvider, SignUp } from "@clerk/nextjs";
import { clerkLocalization } from "../../components/clerk-localization";
import { isClerkConfigured } from "../../server/clerk-config";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSafeRedirectUrl(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue?.startsWith("/") || rawValue.startsWith("//")) {
    return "/";
  }

  return rawValue;
}

export default async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams;
  const redirectUrl = getSafeRedirectUrl(params?.redirect_url);
  const completeUrl = `/auth/complete?redirect_url=${encodeURIComponent(redirectUrl)}`;

  if (!isClerkConfigured()) {
    return (
      <main className="auth-page">
        Clerk ещё не настроен. Добавьте ключи Clerk в переменные окружения.
      </main>
    );
  }

  return (
    <ClerkProvider localization={clerkLocalization}>
      <main className="auth-page">
        <SignUp
          routing="path"
          path="/sign-up"
          fallbackRedirectUrl={completeUrl}
          forceRedirectUrl={completeUrl}
          oauthFlow="redirect"
        />
      </main>
    </ClerkProvider>
  );
}
