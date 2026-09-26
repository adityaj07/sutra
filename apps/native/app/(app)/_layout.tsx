import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useSession } from "@/lib/auth/session";

/**
 * Protected route group. Unauthenticated (or still-loading) sessions render
 * nothing and are bounced to sign-in, so protected screens never flash
 * without a valid session.
 */
export default function AppLayout() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/(auth)/sign-in");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
