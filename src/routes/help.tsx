import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { HELP_FAQS } from "@/lib/help-faq";
import logo from "@/assets/voiceorders-logo.png";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [
    { title: "Κέντρο βοήθειας — VoiceOrders" },
    { name: "description", content: "Απαντήσεις για τα πλάνα, τις παραγγελίες και τις διανομές του VoiceOrders, με βοήθεια AI και συχνές ερωτήσεις." },
    { property: "og:title", content: "Κέντρο βοήθειας — VoiceOrders" },
    { property: "og:description", content: "Βοήθεια AI και συχνές ερωτήσεις για το VoiceOrders." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: HelpPage,
});
function HelpPage() {
  const { lang } = useI18n();
  const [text, setText] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const [transport] = useState(() => new DefaultChatTransport({ api: "/api/public/help", headers: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  } }));
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => { if (!busy && (!document.activeElement || document.activeElement === document.body || document.activeElement === input.current)) input.current?.focus(); }, [busy]);
  return <AppShell title="Κέντρο βοήθειας" back="/plans">
    <div className="mb-4 flex items-center gap-3"><img src={logo} alt="VoiceOrders" className="h-11 w-11 object-contain" /><h2 className="flex-1 text-lg font-semibold">Βοηθός VoiceOrders</h2><Button variant="ghost" size="icon" className="surface press rounded-2xl" title="Νέα συνομιλία" aria-label="Νέα συνομιλία" disabled={busy} onClick={() => { setMessages([]); setText(""); input.current?.focus(); }}><RotateCcw /></Button></div>
    <section aria-label="Συνομιλία βοήθειας" className="surface flex h-[480px] max-h-[70dvh] min-h-[360px] flex-col overflow-hidden rounded-3xl">
      <Conversation><ConversationContent className="gap-5">
        {!messages.length ? <p className="text-sm text-muted-foreground">Πώς μπορώ να σας βοηθήσω;</p> : null}
        {messages.map(m => <Message key={m.id} from={m.role}><MessageContent className={m.role === "user" ? "group-[.is-user]:bg-brand group-[.is-user]:text-brand-foreground" : ""} data-no-translate>{m.parts.map((part, i) => part.type === "text" ? <MessageResponse key={i}>{part.text}</MessageResponse> : part.type === "reasoning" ? <Reasoning key={i} defaultOpen={false}><ReasoningTrigger getThinkingMessage={() => "Σκέψη"} /><ReasoningContent>{part.text}</ReasoningContent></Reasoning> : null)}</MessageContent></Message>)}
        {status === "submitted" ? <Shimmer>Ετοιμάζω την απάντηση...</Shimmer> : null}
      </ConversationContent><ConversationScrollButton aria-label="Τελευταίο μήνυμα" /></Conversation>
      {error ? <p role="alert" className="px-4 py-2 text-sm text-destructive" data-no-translate>{error.message}</p> : null}
      <PromptInput className="m-3 [&>[data-slot=input-group]]:surface-subtle [&>[data-slot=input-group]]:rounded-2xl" onSubmit={async () => { if (!text.trim() || busy) return; const value = text; setText(""); await sendMessage({ text: value }, { body: { language: lang } }); input.current?.focus(); }}>
        <PromptInputTextarea ref={input} autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="Γράψτε την ερώτησή σας..." aria-label="Η ερώτησή σας" className="min-h-16 text-base" />
        <PromptInputFooter className="justify-end"><PromptInputSubmit status={status} onStop={stop} disabled={!busy && !text.trim()} aria-label={busy ? "Διακοπή" : "Αποστολή"} title={busy ? "Διακοπή" : "Αποστολή"} className="h-10 w-10 rounded-xl bg-brand text-brand-foreground">{busy ? undefined : <ArrowUp />}</PromptInputSubmit></PromptInputFooter>
      </PromptInput>
    </section>
    <section className="mt-7"><h2 className="mb-3 text-lg font-semibold">Συχνές ερωτήσεις</h2><div className="divide-y divide-border">{HELP_FAQS.map(f => <details key={f.question} className="py-4"><summary className="cursor-pointer font-semibold">{f.question}</summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.answer}</p></details>)}</div></section>
    <Link to="/plans" className="mt-5 block text-center text-sm font-semibold text-brand">Πλάνα και συνδρομή</Link>
  </AppShell>;
}