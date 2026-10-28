import { loadingList, orderTotal, tripNumbers, type TripWithOrders } from "@/lib/api";
import { formatCurrency, ORDER_STATUS_LABEL } from "@/lib/domain";

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const MARGIN = 88;

type PdfPage = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

function createPdf(trip: TripWithOrders, includeFinance: boolean): Uint8Array {
  const pages: PdfPage[] = [];
  let page = {} as PdfPage;
  let y = 0;

  function startPage() {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Δεν ήταν δυνατή η δημιουργία του PDF.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    page = { canvas, ctx };
    pages.push(page);
    y = MARGIN;
    ctx.fillStyle = "#00a6d6";
    ctx.fillRect(0, 0, PAGE_WIDTH, 18);
  }

  function write(text: string, options: { size?: number; weight?: number; color?: string; gap?: number } = {}) {
    const size = options.size ?? 28;
    const weight = options.weight ?? 400;
    const color = options.color ?? "#1f2937";
    const gap = options.gap ?? 12;
    const maxWidth = PAGE_WIDTH - MARGIN * 2;
    page.ctx.font = `${weight} ${size}px Arial, sans-serif`;
    page.ctx.fillStyle = color;
    const words = String(text || "—").split(/\s+/);
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && page.ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);

    for (const lineText of lines) {
      if (y + size + gap > PAGE_HEIGHT - MARGIN) startPage();
      page.ctx.font = `${weight} ${size}px Arial, sans-serif`;
      page.ctx.fillStyle = color;
      page.ctx.fillText(lineText, MARGIN, y + size);
      y += size + gap;
    }
  }

  function heading(text: string) {
    y += 14;
    write(text, { size: 34, weight: 700, color: "#00a6d6", gap: 16 });
    page.ctx.fillStyle = "#d9e2e8";
    page.ctx.fillRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 2);
    y += 18;
  }

  startPage();
  const totals = tripNumbers(trip);
  const filename = `voiceorders-route-${trip.route_date}.pdf`;
  write("VoiceOrders", { size: 26, weight: 700, color: "#80d000", gap: 18 });
  write("Αναφορά δρομολογίου", { size: 48, weight: 700, color: "#18212b", gap: 12 });
  write(`Ημερομηνία: ${trip.route_date.split("-").reverse().join("/")}`, { size: 30, weight: 600 });
  write(`Παραγγελίες: ${totals.count}`, { size: 28, gap: 22 });

  heading("Σύνοψη διαδρομής");
  write(`Συνολικές στάσεις: ${trip.orders.length}`);
  write(`Παραδοθείσες: ${trip.orders.filter((o) => o.status === "delivered").length}`);
  write(`Ανοιχτές: ${trip.orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length}`);
  write(`Ακυρωμένες: ${trip.orders.filter((o) => o.status === "cancelled").length}`, { gap: 22 });

  if (includeFinance) {
    heading("Οικονομικά");
    write(`Έσοδα: ${formatCurrency(totals.revenue)}`);
    write(`Καύσιμα: ${formatCurrency(trip.fuel)}`);
    write(`Διόδια: ${formatCurrency(trip.tolls)}`);
    write(`Φθορές: ${formatCurrency(trip.wear)}`);
    write(`Διατροφή: ${formatCurrency(trip.food)}`);
    write(`Σύνολο εξόδων: ${formatCurrency(totals.expenses)}`, { weight: 600 });
    write(`Καθαρό αποτέλεσμα: ${formatCurrency(totals.net)}`, { weight: 700, color: "#80d000", gap: 22 });
  }

  heading("Φόρτωση προϊόντων");
  const load = loadingList(trip.orders);
  if (load.length) {
    for (const item of load) write(`• ${item.name}: ${item.qty} ${item.unit}`);
  } else {
    write("Δεν υπάρχουν προϊόντα για φόρτωση.");
  }

  heading("Παραγγελίες");
  for (const [index, order] of trip.orders.entries()) {
    const customer = order.customer?.full_name || "Χωρίς πελάτη";
    const status = ORDER_STATUS_LABEL[order.status] ?? order.status;
    write(`#${order.order_number} · ${customer}`, { size: 30, weight: 700, color: "#18212b", gap: 8 });
    write(`Κατάσταση: ${status}`);
    if (order.phone) write(`Τηλέφωνο: ${order.phone}`);
    if (order.address) write(`Διεύθυνση: ${order.address}`);
    if (order.order_items.length) {
      for (const item of order.order_items) {
        write(`  – ${item.quantity} ${item.unit} ${item.product_name} × ${formatCurrency(item.unit_price)}`, { size: 24, gap: 7 });
      }
    } else {
      write("Δεν υπάρχουν γραμμές προϊόντων.", { size: 24 });
    }
    if (includeFinance) write(`Σύνολο παραγγελίας: ${formatCurrency(orderTotal(order))}`, { size: 25, weight: 600 });
    if (order.notes) write(`Σημειώσεις: ${order.notes}`, { size: 24 });
    if (index < trip.orders.length - 1) {
      y += 6;
      page.ctx.fillStyle = "#e5e7eb";
      page.ctx.fillRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 1);
      y += 14;
    }
  }

  pages.forEach(({ canvas, ctx }, index) => {
    ctx.font = "22px Arial, sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.fillText(`VoiceOrders · ${trip.route_date.split("-").reverse().join("/")} · ${index + 1}/${pages.length}`, MARGIN, PAGE_HEIGHT - 32);
  });

  const encoder = new TextEncoder();
  const objects: Uint8Array[] = [];
  objects[1] = encoder.encode("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  const kidIds = pages.map((_, index) => 3 + index * 3);
  objects[2] = encoder.encode(`2 0 obj\n<< /Type /Pages /Kids [${kidIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`);

  function bytesFromDataUrl(dataUrl: string): Uint8Array {
    const binary = atob(dataUrl.split(",")[1] ?? "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  pages.forEach(({ canvas }, index) => {
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const jpeg = bytesFromDataUrl(canvas.toDataURL("image/jpeg", 0.92));
    objects[pageId] = encoder.encode(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
    objects[contentId] = encoder.encode(`${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\nq\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\nendstream\nendobj\n`);
    const imageHeader = encoder.encode(
      `${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    );
    const imageFooter = encoder.encode("\nendstream\nendobj\n");
    objects[imageId] = new Uint8Array(imageHeader.length + jpeg.length + imageFooter.length);
    objects[imageId].set(imageHeader);
    objects[imageId].set(jpeg, imageHeader.length);
    objects[imageId].set(imageFooter, imageHeader.length + jpeg.length);
  });

  const header = encoder.encode("%PDF-1.4\n");
  const chunks: Uint8Array[] = [header];
  const offsets = new Array(objects.length).fill(0);
  let offset = header.length;
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = offset;
    chunks.push(objects[id]);
    offset += objects[id].length;
  }
  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(encoder.encode(xref));
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const pdf = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, cursor);
    cursor += chunk.length;
  }
  return pdf;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let start = 0; start < bytes.length; start += chunkSize) {
    const chunk = bytes.subarray(start, start + chunkSize);
    for (let i = 0; i < chunk.length; i++) binary += String.fromCharCode(chunk[i]);
  }
  return btoa(binary);
}

export function openTripReport(trip: TripWithOrders, includeFinance: boolean): void {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    window.alert("Επίτρεψε τα αναδυόμενα παράθυρα για να ανοίξει το report.");
    return;
  }

  try {
    const pdf = createPdf(trip, includeFinance);
    const pdfBlob = new Blob([pdf], { type: "application/pdf" });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const base64 = toBase64(pdf);
    const filename = `voiceorders-route-${trip.route_date}.pdf`;
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
    const routeDate = trip.route_date.split("-").reverse().join("/");
    const title = `Αναφορά δρομολογίου · ${routeDate}`;
    reportWindow.document.open();
    reportWindow.document.write(`<!doctype html>
<html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>
*{box-sizing:border-box}body{margin:0;background:#eef2f6;color:#18212b;font-family:Arial,sans-serif}
header{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;background:#fff;box-shadow:0 2px 12px #0002}
header strong{margin-right:auto}button,a{border:0;border-radius:10px;padding:11px 14px;font:600 14px Arial,sans-serif;text-decoration:none;cursor:pointer}
.primary{background:#00a6d6;color:white}.share{background:#80d000;color:#18212b}.download{background:#e53935;color:white}
small{color:#596579}iframe{display:block;width:min(100%,1000px);height:calc(100vh - 120px);min-height:520px;margin:16px auto;border:0;background:white;box-shadow:0 6px 24px #0002}
@media(max-width:600px){header{gap:7px;padding:10px}header strong{width:100%}button,a{flex:1;text-align:center;padding:10px 8px}iframe{height:calc(100vh - 150px);min-height:420px;margin:10px auto}}
@media print{header{display:none}iframe{width:100%;height:100vh;margin:0;box-shadow:none}}
</style></head><body>
<header><strong>${title}</strong><small>Το PDF είναι έτοιμο για αποθήκευση ή κοινοποίηση.</small>
<a class="download" href="${pdfUrl}" download="${safeFilename}">Λήψη PDF</a>
<button class="share" id="share" type="button">Κοινοποίηση PDF</button>
<button class="primary" type="button" onclick="window.print()">Εκτύπωση</button></header>
<iframe title="${title}" src="${pdfUrl}"></iframe>
<script>
const pdfData="${base64}";
const fileName="${safeFilename}";
document.getElementById("share").addEventListener("click", async () => {
  const binary=atob(pdfData), bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  const file=new File([bytes],fileName,{type:"application/pdf"});
  if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:${JSON.stringify(title)},text:"Αναφορά δρομολογίου VoiceOrders"});}
    catch(error){if(error.name!=="AbortError")alert("Δεν ήταν δυνατή η κοινοποίηση. Χρησιμοποίησε το κουμπί Λήψη PDF.");}
  }else{
    const link=document.createElement("a");link.href="${pdfUrl}";link.download=fileName;link.click();
    alert("Η συσκευή δεν υποστηρίζει απευθείας κοινοποίηση αρχείου PDF. Το PDF κατέβηκε· μπορείς να το επισυνάψεις με email, MMS/SMS, Viber ή WhatsApp.");
  }
});
</script></body></html>`);
    reportWindow.document.close();
    reportWindow.focus();
  } catch (error) {
    reportWindow.close();
    window.alert(error instanceof Error ? error.message : "Δεν ήταν δυνατή η δημιουργία του PDF.");
  }
}
