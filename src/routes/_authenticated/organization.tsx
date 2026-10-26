import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Users, UserPlus, Copy, Trash2 } from "lucide-react";
import { AppShell, Card, EmptyState } from "@/components/AppShell";
import { Field, PrimaryButton, GhostButton, Select } from "@/components/Field";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OrgAccess } from "@/components/OrgAccess";
import { ROLE_LABEL, useOrg, fetchMembers, fetchInvitations, createInvitation, cancelInvitation, changeMemberRole, removeMember, renameOrganization, inviteLink, type Member, type OrgRole } from "@/lib/org";

export const Route = createFileRoute("/_authenticated/organization")({
  head: () => ({ meta: [
    { title: "Επιχείρηση και μέλη — VoiceOrders" },
    { name: "description", content: "Στοιχεία επιχείρησης, μέλη, ρόλοι και προσκλήσεις στο VoiceOrders." },
    { property: "og:title", content: "Επιχείρηση και μέλη — VoiceOrders" },
    { property: "og:description", content: "Διαχείριση επιχείρησης και μελών στο VoiceOrders." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: OrganizationPage,
});

function OrganizationPage() {
  return <OrgAccess permission="org.manage" title="Επιχείρηση"><OrganizationBody /></OrgAccess>;
}

function OrganizationBody() {
  const { org, canAddMember } = useOrg();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("driver");
  const [link, setLink] = useState("");
  const [removing, setRemoving] = useState<Member | null>(null);
  const members = useQuery({ queryKey: ["org-members", org?.organization_id], queryFn: fetchMembers, enabled: !!org });
  const invitations = useQuery({ queryKey: ["org-invitations", org?.organization_id], queryFn: () => org ? fetchInvitations(org.organization_id) : Promise.resolve([]), enabled: !!org });
  useEffect(() => { if (org) setName(org.organization_name); }, [org?.organization_name]);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try { await action(); await qc.invalidateQueries(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Σφάλμα"); }
    finally { setBusy(false); }
  }
  if (!org) return null;
  const pending = (invitations.data ?? []).filter((i) => new Date(i.expires_at).getTime() > Date.now());
  return <AppShell title="Επιχείρηση" back="/profile">
    <div className="space-y-4">
      <Card className="space-y-3">
        <Building2 className="h-7 w-7 text-brand" />
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (name.trim()) void run(async () => { await renameOrganization(org.organization_id, name.trim()); toast.success("Οι αλλαγές αποθηκεύτηκαν."); }); }}>
          <Field label="Όνομα επιχείρησης" value={name} onChange={(e) => setName(e.target.value)} required maxLength={150} />
          <PrimaryButton disabled={busy || !name.trim() || name.trim() === org.organization_name}>Αποθήκευση αλλαγών</PrimaryButton>
        </form>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <div><p className="text-xs text-muted-foreground">Πλάνο</p><p className="font-semibold">{org.plan_name ?? "—"}</p></div>
          <div className="text-right"><p className="text-xs text-muted-foreground">Χρήστες</p><p className="font-semibold">{org.active_users} / {org.max_users}</p></div>
        </div>
        <Link to="/plans" className="press flex h-12 items-center justify-center rounded-2xl surface font-semibold">Πλάνα και συνδρομή</Link>
      </Card>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5" />Μέλη</h2></div>
        {members.isError ? <EmptyState title="Δεν ήταν δυνατή η φόρτωση των μελών." /> : (members.data ?? []).map((m) => <Card key={m.member_id} className="space-y-3">
          <div className="min-w-0"><p className="font-semibold break-words" data-no-translate>{m.full_name || m.email}</p><p className="text-sm text-muted-foreground break-all" data-no-translate>{m.email}</p><p className="mt-1 text-sm text-brand"><span>{ROLE_LABEL[m.role]}</span> · <span>Ενεργό μέλος</span></p></div>
          {m.role !== "owner" ? <div className="space-y-2">
            <Select label="Ρόλος" value={m.role} disabled={busy} onChange={(e) => { const r = e.target.value; if (r === "manager" || r === "driver") void run(() => changeMemberRole(m.member_id, r)); }}><option value="manager">Υπεύθυνος</option><option value="driver">Διανομέας</option></Select>
            <GhostButton disabled={busy} className="text-destructive" onClick={() => setRemoving(m)}><span className="inline-flex items-center gap-2"><Trash2 className="h-4 w-4" />Αφαίρεση μέλους</span></GhostButton>
          </div> : null}
        </Card>)}
        {!canAddMember() ? <p className="text-sm text-warning">Φτάσατε τον μέγιστο αριθμό χρηστών του πλάνου σας.</p> : null}
        <PrimaryButton disabled={!canAddMember() || busy} onClick={() => { setInvite(true); setLink(""); }}><span className="inline-flex items-center gap-2"><UserPlus className="h-5 w-5" />Πρόσκληση μέλους</span></PrimaryButton>
      </section>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Εκκρεμείς προσκλήσεις</h2>
        {invitations.isError ? <EmptyState title="Δεν ήταν δυνατή η φόρτωση των προσκλήσεων." /> : !pending.length ? <EmptyState title="Δεν υπάρχουν εκκρεμείς προσκλήσεις." /> : pending.map((i) => <Card key={i.id} className="space-y-2">
          <p className="font-semibold break-all" data-no-translate>{i.email}</p><p className="text-sm text-muted-foreground"><span>{ROLE_LABEL[i.role]}</span> · <span>Εκκρεμής</span></p>
          <GhostButton onClick={() => void navigator.clipboard.writeText(inviteLink(i.token)).then(() => toast.success("Ο σύνδεσμος αντιγράφηκε.")).catch(() => { setLink(inviteLink(i.token)); setInvite(true); })}><span className="inline-flex items-center gap-2"><Copy className="h-4 w-4" />Αντιγραφή συνδέσμου</span></GhostButton>
          <GhostButton disabled={busy} className="text-destructive" onClick={() => void run(() => cancelInvitation(i.id))}>Ακύρωση πρόσκλησης</GhostButton>
        </Card>)}
      </section>
    </div>
    <Dialog open={invite} onOpenChange={setInvite}><DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[420px] rounded-3xl sm:rounded-3xl max-h-[85dvh] overflow-y-auto">
      <DialogTitle>Πρόσκληση μέλους</DialogTitle><DialogDescription>{link ? "Μοιραστείτε τον σύνδεσμο με το προσκεκλημένο μέλος. Δεν έχει σταλεί email." : "Email και ρόλος νέου μέλους"}</DialogDescription>
      {link ? <><Field label="Σύνδεσμος πρόσκλησης" value={link} readOnly /><GhostButton onClick={() => void navigator.clipboard.writeText(link).then(() => toast.success("Ο σύνδεσμος αντιγράφηκε.")).catch(() => toast.error("Δεν ήταν δυνατή η αντιγραφή."))}>Αντιγραφή συνδέσμου</GhostButton></> : <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!canAddMember()) return; void run(async () => { const token = await createInvitation(org.organization_id, email, role); setLink(inviteLink(token)); setEmail(""); }); }}>
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Select label="Ρόλος" value={role} onChange={(e) => { if (e.target.value === "manager" || e.target.value === "driver") setRole(e.target.value); }}><option value="driver">Διανομέας</option><option value="manager">Υπεύθυνος</option></Select>
        <PrimaryButton disabled={busy || !canAddMember()}>Δημιουργία πρόσκλησης</PrimaryButton>
      </form>}
    </DialogContent></Dialog>
    <Dialog open={!!removing} onOpenChange={(v) => { if (!v) setRemoving(null); }}><DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[420px] rounded-3xl sm:rounded-3xl"><DialogTitle>Αφαίρεση μέλους</DialogTitle><DialogDescription><span data-no-translate>{removing?.full_name || removing?.email}</span></DialogDescription><GhostButton disabled={busy} className="text-destructive" onClick={() => { if (removing) void run(async () => { await removeMember(removing.member_id); setRemoving(null); }); }}>Επιβεβαίωση αφαίρεσης</GhostButton></DialogContent></Dialog>
  </AppShell>;
}