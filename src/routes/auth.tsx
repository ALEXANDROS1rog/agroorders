import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Ambient } from "@/components/AppShell";
import { Field, GhostButton, PrimaryButton } from "@/components/Field";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Σύνδεση — AgroOrders" },
      {
        name: "description",
        content: "Συνδέσου ή δημιούργησε λογαριασμό παραγωγού στο AgroOrders.",
      },
      { property: "og:title", content: "Σύνδεση — AgroOrders" },
      { property: "og:description", content: "Σύνδεση παραγωγού στο AgroOrders." },
    ],
  }),
  component: AuthPage;
});

type Mode = "login" | "register" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    business_name: "",
    phone: "",
    email: "",
    password: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard" });
        return;
      }

      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: form.first_name.trim(),
              last_name: form.last_name.trim(),
              business_name: form.business_name.trim(),
              phone: form.phone.trim(),
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/dashboard" });
        } else {
          toast.success("Στείλαμε email επιβεβαίωσης. Άνοιξέ το για να ενεργοποιηθεί ο λογαριασμός.");
          setMode("login");
        }
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (error) throw error;
      toast.success("Στείλαμε σύνδεσμο επαναφοράς στο email σου.");
      setMode("login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Κάτι πήγε λάθος.";
      toast.error(
        message.includes("Invalid login credentials")
          ? "Λάθος email ή κωδικός."
          : message.includes("Email not confirmed")
            ? "Το email δεν έχει επιβεβαιωθεί ακόμα."
            : message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Ambient />
      <div className="relative mx-auto flex min-h-screen max-w-[460px] flex-col justify-center px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/20 ring-1 ring-brand/40">
            <span className="font-display text-xl font-bold text-brand">Α</span>
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold leading-none">AgroOrders</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Παραγγελίες & διανομές για παραγωγούς
            </p>
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <div className="glass-soft mb-5 flex rounded-2xl p-1">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`press flex-1 rounded-xl py-2.5 text-sm font-semibold ${
                  mode === m ? "bg-brand/20 text-brand ring-1 ring-brand/30" : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "Σύνδεση" : "Εγγραφή"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "register" ? (
              <>
                <Field label="Όνομα" value={form.first_name} onChange={set("first_name")} required />
                <Field label="Επώνυμο" value={form.last_name} onChange={set("last_name")} required />
                <Field
                  label="Επιχείρηση"
                  value={form.business_name}
                  onChange={set("business_name")}
                  placeholder="π.χ. Φάρμα Παπαδόπουλου"
                  required
                />
                <Field
                  label="Τηλέφωνο"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  required
                />
              </>
            ) : null}

            <Field
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={set("email")}
              required
            />

            {mode !== "forgot" ? (
              <Field
                label="Κωδικός"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={form.password}
                onChange={set("password")}
                minLength={6}
                required
              />
            ) : null}

            <PrimaryButton type="submit" disabled={busy}>
              {busy
                ? "Περίμενε…"
                : mode === "login"
                  ? "Σύνδεση"
                  : mode === "register"
                    ? "Δημιουργία λογαριασμού"
                    : "Στείλε σύνδεσμο επαναφοράς"}
            </PrimaryButton>
          </form>

          {mode === "login" ? (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="mt-4 w-full text-center text-sm font-semibold text-accent"
            >
              Ξέχασα τον κωδικό μου
            </button>
          ) : null}

          {mode === "forgot" ? (
            <div className="mt-3">
              <GhostButton type="button" onClick={() => setMode("login")}>
                Πίσω στη σύνδεση
              </GhostButton>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
