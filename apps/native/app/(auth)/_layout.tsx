import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useSession } from "@/lib/auth/session";

/**
 * Public route group. Authenticated sessions are bounced into `(app)`;
 * nothing renders while bootstrap is loading to avoid a sign-in flash.
 */
export default function AuthLayout() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/(app)");
    }
  }, [status, router]);

  if (status !== "unauthenticated") {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
