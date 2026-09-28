import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExtractedProduct = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  matched: boolean;
};

export type ExtractedOrder = {
  customer_name: string | null;
  phone: string | null;
  address: string | null;
  products: ExtractedProduct[];
  uncertain: string[];
  transcription_id: string | null;
};

/** Accent/case-insensitive Greek comparison key. */
function key(value: string): string {
  return value
    .toLocaleLowerCase("el-GR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zα-ω0-9]/g, "");
}

function parseJsonBlock(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Streams a Lovable AI Gateway Responses call and returns the accumulated text. */
async function callGateway(system: string, user: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Η υπηρεσία AI δεν είναι διαθέσιμη (λείπει το κλειδί).");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        { role: "user", content: [{ type: "input_text", text: user }] },
      ],
      reasoning: { effort: "low", summary: "auto" },
      store: false,
      include: ["reasoning.encrypted_content"],
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const body = await response.text();
    console.error(`AI gateway failed [${response.status}]: ${body}`);
    if (response.status === 429) {
      throw new Error("Πολλά αιτήματα AI. Δοκίμασε ξανά σε λίγο.");
    }
    if (response.status === 402) {
      throw new Error("Τα credits για το AI εξαντλήθηκαν. Χρειάζεται ανανέωση.");
    }
    throw new Error("Η ανάλυση με AI απέτυχε. Δοκίμασε ξανά.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          text?: string;
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        } else if (
          event.type === "response.output_text.done" &&
          typeof event.text === "string" &&
          text.length === 0
        ) {
          text = event.text;
        }
      } catch {
        // ignore keep-alive / partial frames
      }
    }
  }

  return text;
}

/** Transcribes a short voice recording (base64) into Greek text. */
export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { audio: string; format: string }) => {
    const audio = String(data?.audio ?? "");
    if (audio.length < 100) throw new Error("Η ηχογράφηση είναι πολύ μικρή.");
    if (audio.length > 14_000_000) throw new Error("Η ηχογράφηση είναι πολύ μεγάλη (μέχρι ~5 λεπτά).");
    const format = /^[a-z0-9]{2,5}$/.test(data?.format ?? "") ? data.format : "webm";
    return { audio, format };
  })
  .handler(async ({ data }): Promise<{ text: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Η υπηρεσία AI δεν είναι διαθέσιμη.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Κάνε πιστή απομαγνητοφώνηση στα ελληνικά αυτής της ηχογράφησης (πελάτης που δίνει παραγγελία). Γράψε μόνο ό,τι ακούγεται, χωρίς σχόλια. Τα τηλέφωνα γράψ' τα με ψηφία. Αν δεν ακούγεται ομιλία, απάντησε ΚΕΝΟ.",
              },
              { type: "input_audio", input_audio: { data: data.audio, format: data.format } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`Transcription failed [${res.status}]: ${await res.text()}`);
      if (res.status === 429) throw new Error("Πολλά αιτήματα AI. Δοκίμασε ξανά σε λίγο.");
      if (res.status === 402) throw new Error("Τα credits για το AI εξαντλήθηκαν.");
      throw new Error("Η απομαγνητοφώνηση απέτυχε. Δοκίμασε ξανά.");
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = (json.choices?.[0]?.message?.content ?? "").trim();
    if (!text || text === "ΚΕΝΟ") throw new Error("Δεν ακούστηκε ομιλία. Δοκίμασε ξανά πιο κοντά στο μικρόφωνο.");
    return { text };
  });

export const extractOrderFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { text: string; source?: string }) => {
    const text = (data?.text ?? "").trim();
    if (text.length < 5) throw new Error("Γράψε λίγο περισσότερο κείμενο.");
    return { text: text.slice(0, 6000), source: data?.source === "voice" ? "voice" : "text" };
  })
  .handler(async ({ data, context }): Promise<ExtractedOrder> => {
    const { supabase, userId } = context;

    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, price, unit, available")
      .eq("available", true);
    if (error) throw error;

    const catalog = (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      unit: p.unit,
    }));

    const system = [
      "Είσαι βοηθός Έλληνα παραγωγού. Διαβάζεις κείμενο συνομιλίας με πελάτη και εξάγεις την παραγγελία.",
      "ΚΑΝΟΝΕΣ:",
      "- Μην εφευρίσκεις ΠΟΤΕ προϊόντα, ποσότητες, τηλέφωνα ή διευθύνσεις που δεν αναφέρονται.",
      "- Το product_name πρέπει να είναι ΑΚΡΙΒΩΣ ένα όνομα από τον κατάλογο προϊόντων. Αν κάτι δεν ταιριάζει με τον κατάλογο, γράψε το όπως ακούστηκε και πρόσθεσέ το στο uncertain.",
      "- Μετέτρεψε τα ελληνικά αριθμητικά σε νούμερα (π.χ. δύο -> 2, μία -> 1).",
      "- Αν κάποια πληροφορία είναι ασαφής, πρόσθεσε σύντομη περιγραφή στο uncertain.",
      "- Αν δεν αναφέρεται όνομα, τηλέφωνο ή διεύθυνση, βάλε null.",
      "",
      "ΚΑΤΑΛΟΓΟΣ ΠΡΟΪΟΝΤΩΝ:",
      catalog.length > 0
        ? catalog.map((p) => `- ${p.name} (${p.price} € / ${p.unit})`).join("\n")
        : "(κενός κατάλογος)",
      "",
      'Απάντησε ΜΟΝΟ με JSON αυτής της μορφής: {"customer_name": null, "phone": null, "address": null, "products": [{"product_name": "", "quantity": 0}], "uncertain": []}',
    ].join("\n");

    const raw = await callGateway(system, data.text);
    const parsed = parseJsonBlock(raw);
    if (!parsed) throw new Error("Δεν κατάφερα να διαβάσω την παραγγελία. Δοκίμασε ξανά.");

    const byKey = new Map(catalog.map((p) => [key(p.name), p]));
    const uncertain = Array.isArray(parsed["uncertain"])
      ? (parsed["uncertain"] as unknown[]).map((u) => String(u)).filter(Boolean)
      : [];

    const rawProducts = Array.isArray(parsed["products"]) ? parsed["products"] : [];
    const items: ExtractedProduct[] = [];
    for (const entry of rawProducts as Record<string, unknown>[]) {
      const name = String(entry["product_name"] ?? "").trim();
      const quantity = Number(entry["quantity"] ?? 0);
      if (!name || !Number.isFinite(quantity) || quantity <= 0) continue;
      const match = byKey.get(key(name));
      if (match) {
        items.push({
          product_id: match.id,
          product_name: match.name,
          quantity,
          unit: match.unit,
          unit_price: match.price,
          matched: true,
        });
      } else {
        items.push({
          product_id: null,
          product_name: name,
          quantity,
          unit: "τεμ.",
          unit_price: 0,
          matched: false,
        });
        uncertain.push(`Το προϊόν «${name}» δεν βρέθηκε στον κατάλογο.`);
      }
    }

    const phoneRaw = parsed["phone"];
    const phone = phoneRaw ? String(phoneRaw).replace(/[^\d+]/g, "") : null;
    const addressRaw = parsed["address"];
    const nameRaw = parsed["customer_name"];

    const result: ExtractedOrder = {
      customer_name: nameRaw ? String(nameRaw) : null,
      phone: phone || null,
      address: addressRaw ? String(addressRaw) : null,
      products: items,
      uncertain: [...new Set(uncertain)],
      transcription_id: null,
    };

    const { data: saved } = await supabase
      .from("ai_transcriptions")
      .insert({
        user_id: userId,
        raw_text: data.text,
        extracted: result as unknown as never,
        source: "text",
        status: "extracted",
      })
      .select("id")
      .maybeSingle();

    result.transcription_id = saved?.id ?? null;
    return result;
  });
