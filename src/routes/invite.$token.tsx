import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ambient } from "@/components/AppShell";
import { PrimaryButton } from "@/components/Field";
import { supabase } from "@/integrations/supabase/client";
import { PENDING_INVITE_KEY, ROLE_LABEL, acceptInvitation, getInvitation, type OrgRole } from "@/lib/org";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Αποδοχή πρόσκλησης — VoiceOrders" },
      { name: "description", content: "Γίνετε μέλος μιας επιχείρησης στο VoiceOrders." },
      { property: "og:title", content: "Αποδοχή πρόσκλησης — VoiceOrders" },
      { property: "og:description", content: "Γίνετε μέλος μιας επιχείρησης στο VoiceOrders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const inv = useQuery({ queryKey: ["invite", token], queryFn: () => getInvitation(token), retry: false });

  useEffect(() => {
    sessionStorage.setItem(PENDING_INVITE_KEY, token);
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [token]);

  async function accept() {
    setBusy(true);
    try {
      await acceptInvitation(token);
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      await qc.invalidateQueries();
      toast.success("Έγινες μέλος της επιχείρησης.");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Σφάλμα");
    } finally { setBusy(false); }
  }

  const i = inv.data;
  const usable = i && i.status === "pending" && !i.expired;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Ambient />
      <div className="relative mx-auto flex min-h-screen max-w-[460px] flex-col justify-center px-4 py-10">
        <div className="glass space-y-4 rounded-3xl p-5">
          <h1 className="font-display text-xl font-semibold">Αποδοχή πρόσκλησης</h1>
          {inv.isLoading || email === undefined ? <p className="text-muted-foreground">Περίμενε…</p> : !i ? (
            <p>Η πρόσκληση δεν βρέθηκε.</p>
          ) : !usable ? (
            <p>Η πρόσκληση δεν είναι πλέον ενεργή.</p>
          ) : (
            <>
              <p className="text-[15px]">Έχεις προσκληθεί στην επιχείρηση <b>{i.organization_name}</b> ως <b>{ROLE_LABEL[i.role as OrgRole]}</b>.</p>
              <p className="text-sm text-muted-foreground">Email πρόσκλησης: {i.email}</p>
              {email ? (
                email.toLowerCase() === i.email ? (
                  <PrimaryButton disabled={busy} onClick={accept}>Αποδοχή πρόσκλησης</PrimaryButton>
                ) : (
                  <p className="text-sm text-destructive">Είσαι συνδεδεμένος ως {email}. Αποσυνδέσου και συνδέσου με το email της πρόσκλησης.</p>
                )
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Συνδέσου ή δημιούργησε λογαριασμό με αυτό το email για να συνεχίσεις.</p>
                  <Link to="/auth" className="press flex h-14 w-full items-center justify-center rounded-2xl bg-brand font-semibold text-brand-foreground">Σύνδεση ή εγγραφή</Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
