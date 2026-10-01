import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Ambient } from "@/components/AppShell";
import { Field, PrimaryButton } from "@/components/Field";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/reset")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Νέος κωδικός — FarmOrders" },
      { name: "description", content: "Όρισε νέο κωδικό για τον λογαριασμό σου." },
      { property: "og:title", content: "Νέος κωδικός — FarmOrders" },
      { property: "og:description", content: "Όρισε νέο κωδικό για τον λογαριασμό σου." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Ο κωδικός άλλαξε.");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Κάτι πήγε λάθος.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Ambient />
      <div className="relative mx-auto flex min-h-screen max-w-[460px] flex-col justify-center px-4">
        <div className="glass rounded-3xl p-5">
          <h1 className="font-display text-lg font-semibold">Νέος κωδικός</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Άνοιξε αυτή τη σελίδα από τον σύνδεσμο του email και όρισε νέο κωδικό.
          </p>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <Field
              label="Νέος κωδικός"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Περίμενε…" : "Αποθήκευση"}
            </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  );
}
