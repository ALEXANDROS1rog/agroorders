import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Field, GhostButton, PrimaryButton } from "@/components/Field";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { PENDING_INVITE_KEY, fetchOrgContext } from "@/lib/org";
import { needsPlanSelection } from "@/lib/subscription-rules";
import logoUrl from "@/assets/voiceorders-logo.png";

type SocialProvider = "google" | "apple";

const SOCIAL_OPTIONS: { id: SocialProvider; label: string; icon: React.ReactNode }[] = [
  {
    id: "google",
    label: "Σύνδεση με Google",
    icon: (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
        <path
          fill="#4285F4"
          d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
        />
        <path
          fill="#34A853"
          d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
        />
        <path
          fill="#FBBC05"
          d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
        />
        <path
          fill="#EA4335"
          d="M24 10.75c3.23 0 6.13 1.11 8.41 3.3l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
        />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Σύνδεση με Apple",
    icon: (
      <svg viewBox="0.735 0.84 21.81 21.81" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M17.05 12.54c-.03-2.66 2.17-3.94 2.27-4a4.7 4.7 0 0 0-3.7-2.02c-1.55-.16-3.06.93-3.85.93-.79 0-2.02-.9-3.32-.88-1.7.03-3.28.99-4.15 2.52-1.77 3.07-.45 7.62 1.27 10.11.84 1.22 1.85 2.59 3.17 2.54 1.27-.05 1.75-.82 3.29-.82 1.53 0 1.97.82 3.31.8 1.37-.03 2.24-1.25 3.08-2.48a10.4 10.4 0 0 0 1.4-2.87 4.5 4.5 0 0 1-2.77-3.81ZM14.53 4.86a4.35 4.35 0 0 0 1-3.11 4.4 4.4 0 0 0-2.86 1.48 4.12 4.12 0 0 0-1.02 3 3.65 3.65 0 0 0 2.88-1.37Z" />
      </svg>
    ),
  },
];

async function afterLogin(navigate: ReturnType<typeof useNavigate>) {
  const token = sessionStorage.getItem(PENDING_INVITE_KEY);
  if (token) navigate({ to: "/invite/$token", params: { token } });
  else {
    const org = await fetchOrgContext();
    await navigate({ to: needsPlanSelection(org) ? "/plans" : "/dashboard" });
  }
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Σύνδεση — VoiceOrders" },
      {
        name: "description",
        content: "Συνδέσου ή δημιούργησε λογαριασμό παραγωγού στο VoiceOrders.",
      },
      { property: "og:title", content: "Σύνδεση — VoiceOrders" },
      { property: "og:description", content: "Σύνδεση παραγωγού στο VoiceOrders." },
      { property: "og:url", content: "https://voiceorders.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://voiceorders.lovable.app/auth" }],
  }),
  component: AuthPage,
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

  async function onSocial(provider: SocialProvider) {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      await afterLogin(navigate);
    } catch {
      toast.error("Δεν ήταν δυνατή η σύνδεση. Δοκίμασε ξανά.");
    } finally {
      setBusy(false);
    }
  }

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
        await afterLogin(navigate);
        return;
      }

      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: sessionStorage.getItem(PENDING_INVITE_KEY)
              ? `${window.location.origin}/invite/${sessionStorage.getItem(PENDING_INVITE_KEY)}`
              : `${window.location.origin}/plans`,
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
          if (sessionStorage.getItem(PENDING_INVITE_KEY)) await afterLogin(navigate);
          else navigate({ to: "/plans" });
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
      <div className="relative mx-auto flex min-h-screen max-w-[460px] flex-col justify-center px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/20 ring-1 ring-brand/40">
            <img src={logoUrl} alt="VoiceOrders" width={40} height={40} className="h-10 w-10 object-contain" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold leading-none">VoiceOrders — Διαχείριση Παραγγελιών</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Παραγγελίες & διανομές για παραγωγούς
            </p>
          </div>
        </div>

        <div className="surface rounded-3xl p-5">
          <div className="surface-subtle mb-5 flex rounded-2xl p-1">
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
                <p className="text-sm text-muted-foreground">Η εγγραφή είναι δωρεάν. Δεν απαιτείται κάρτα.</p>
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

          {mode !== "forgot" ? (
            <>
              <div className="my-4 flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">ή</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2.5">
                {SOCIAL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={busy}
                    onClick={() => onSocial(option.id)}
                    className="press surface-subtle relative flex h-14 w-full items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-foreground ring-1 ring-border/60 disabled:opacity-60"
                  >
                    <span className="absolute left-5 grid h-5 w-5 place-items-center">{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}

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
