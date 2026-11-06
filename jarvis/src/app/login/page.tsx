import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { HudBackground } from "@/components/hud/HudBackground";

export const metadata: Metadata = {
  title: "Zugang · J.A.R.V.I.S.",
};

export default function LoginPage() {
  return (
    <main className="relative isolate flex h-dvh items-center justify-center overflow-y-auto px-4">
      <HudBackground />
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
