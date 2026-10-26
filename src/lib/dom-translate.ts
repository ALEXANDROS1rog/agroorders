import en from "./locales/en.json";
import sq from "./locales/sq.json";
import bg from "./locales/bg.json";
import ro from "./locales/ro.json";
import sr from "./locales/sr.json";
import hr from "./locales/hr.json";
import bs from "./locales/bs.json";
import mk from "./locales/mk.json";
import sl from "./locales/sl.json";
import me from "./locales/me.json";
import tr from "./locales/tr.json";
import orgEn from "./locales/organization/en.json";
import orgSq from "./locales/organization/sq.json";
import orgBg from "./locales/organization/bg.json";
import orgRo from "./locales/organization/ro.json";
import orgSr from "./locales/organization/sr.json";
import orgHr from "./locales/organization/hr.json";
import orgBs from "./locales/organization/bs.json";
import orgMk from "./locales/organization/mk.json";
import orgSl from "./locales/organization/sl.json";
import orgMe from "./locales/organization/me.json";
import orgTr from "./locales/organization/tr.json";
import payEn from "./locales/payments/en.json";
import paySq from "./locales/payments/sq.json";
import payBg from "./locales/payments/bg.json";
import payRo from "./locales/payments/ro.json";
import paySr from "./locales/payments/sr.json";
import payHr from "./locales/payments/hr.json";
import payBs from "./locales/payments/bs.json";
import payMk from "./locales/payments/mk.json";
import paySl from "./locales/payments/sl.json";
import payMe from "./locales/payments/me.json";
import payTr from "./locales/payments/tr.json";

/** Greek source text -> translated text, per language. Greek ("el") needs no map. */
export const LOCALE_MAPS: Record<string, Record<string, string>> = { en: { ...en, ...orgEn, ...payEn }, sq: { ...sq, ...orgSq, ...paySq }, bg: { ...bg, ...orgBg, ...payBg }, ro: { ...ro, ...orgRo, ...payRo }, sr: { ...sr, ...orgSr, ...paySr }, hr: { ...hr, ...orgHr, ...payHr }, bs: { ...bs, ...orgBs, ...payBs }, mk: { ...mk, ...orgMk, ...payMk }, sl: { ...sl, ...orgSl, ...paySl }, me: { ...me, ...orgMe, ...payMe }, tr: { ...tr, ...orgTr, ...payTr } };

const ATTRS = ["placeholder", "aria-label", "title"];
const GREEK = /[\u0370-\u03ff\u1f00-\u1fff]/;

// Remember the original (Greek) text React rendered, so switching language always starts from it.
const textOrig = new WeakMap<Node, { orig: string; set: string }>();
const attrOrig = new WeakMap<Element, Record<string, { orig: string; set: string }>>();

const keyCache = new WeakMap<Record<string, string>, string[]>();
function sortedKeys(map: Record<string, string>): string[] {
  let keys = keyCache.get(map);
  if (!keys) { keys = Object.keys(map).sort((a, b) => b.length - a.length); keyCache.set(map, keys); }
  return keys;
}

function lookup(map: Record<string, string> | undefined, value: string): string {
  if (!map || !GREEK.test(value)) return value;
  const trimmed = value.trim();
  let hit = map[trimmed];
  if (!hit) {
    // Text built from a template ("Καλώς ήρθες, Μαρία"): translate the known leading phrase.
    const keys = sortedKeys(map);
    const k = keys.find((key) => trimmed.startsWith(key) && /^[\s,:#·(.!?—-]/.test(trimmed.slice(key.length)));
    if (!k) return value;
    hit = map[k] + trimmed.slice(k.length);
  }
  const lead = value.slice(0, value.indexOf(trimmed));
  return lead + hit + value.slice(lead.length + trimmed.length);
}

export function translateText(lang: string, value: string): string {
  return lookup(LOCALE_MAPS[lang], value);
}

function processText(node: Text, map: Record<string, string> | undefined) {
  const cur = node.nodeValue ?? "";
  const rec = textOrig.get(node);
  const orig = rec && rec.set === cur ? rec.orig : cur;
  const next = lookup(map, orig);
  textOrig.set(node, { orig, set: next });
  if (next !== cur) node.nodeValue = next;
}

function processEl(el: Element, map: Record<string, string> | undefined) {
  for (const a of ATTRS) {
    const cur = el.getAttribute(a);
    if (cur == null) continue;
    const recs = attrOrig.get(el) ?? {};
    const rec = recs[a];
    const orig = rec && rec.set === cur ? rec.orig : cur;
    const next = lookup(map, orig);
    recs[a] = { orig, set: next };
    attrOrig.set(el, recs);
    if (next !== cur) el.setAttribute(a, next);
  }
}

function walk(root: Node, map: Record<string, string> | undefined) {
  if (root.nodeType === Node.TEXT_NODE) return processText(root as Text, map);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.closest("[data-no-translate]")) return;
  processEl(el, map);
  for (const child of Array.from(el.childNodes)) walk(child, map);
}

/** Translates every Greek UI text on screen into the chosen language and keeps it translated. */
export function installDomTranslator(lang: string): () => void {
  const map = LOCALE_MAPS[lang];
  walk(document.body, map);
  const titleEl = document.querySelector("title");
  if (titleEl) walk(titleEl, map);

  const origConfirm = window.confirm.bind(window);
  window.confirm = (msg?: string) => origConfirm(msg ? lookup(map, msg) : msg);

  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") processText(m.target as Text, map);
      else if (m.type === "attributes") processEl(m.target as Element, map);
      else m.addedNodes.forEach((n) => walk(n, map));
    }
  });
  obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  return () => {
    obs.disconnect();
    window.confirm = origConfirm;
  };
}
