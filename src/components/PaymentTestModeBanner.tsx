export function PaymentTestModeBanner() {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
  if (token?.startsWith("pk_live_")) return null;
  return <p role="status" className="mb-4 border-b border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{token?.startsWith("pk_test_") ? "Δοκιμαστικές πληρωμές — δεν χρεώνονται πραγματικά χρήματα." : "Οι πραγματικές πληρωμές δεν έχουν ενεργοποιηθεί ακόμα."}</p>;
}