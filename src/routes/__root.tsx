import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";
import { CompanySync } from "@/components/CompanySync";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Η σελίδα δεν βρέθηκε</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Η σελίδα που ψάχνεις δεν υπάρχει ή μετακινήθηκε.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Αρχική
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Κάτι πήγε λάθος
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Δοκίμασε ξανά ή επέστρεψε στην αρχική σελίδα.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Δοκίμασε ξανά
          </button>
          <a
            href="/"
            className="surface inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-foreground"
          >
            Αρχική
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "VoiceOrders — Παραγγελίες & Διανομές" },
      {
        name: "description",
        content:
          "Διαχείριση παραγγελιών, πελατών, προϊόντων και διανομών για παραγωγούς.",
      },
      { name: "theme-color", content: "#0b1220", media: "(prefers-color-scheme: dark)" },
      { name: "theme-color", content: "#eef2f8", media: "(prefers-color-scheme: light)" },
      {
        name: "google-site-verification",
        content: "NGTBkpIb5DcWj-P-dlzM3mZMjoyGqmA6_r7A9v7Ek2E",
      },
      { property: "og:title", content: "VoiceOrders" },
      { property: "og:description", content: "Παραγγελίες και διανομές για παραγωγούς." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "VoiceOrders" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      { rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://voiceorders.lovable.app/#organization",
              name: "VoiceOrders",
              url: "https://voiceorders.lovable.app/",
              logo: "https://voiceorders.lovable.app/favicon.png",
            },
            {
              "@type": "WebSite",
              "@id": "https://voiceorders.lovable.app/#website",
              url: "https://voiceorders.lovable.app/",
              name: "VoiceOrders",
              description:
                "Διαχείριση παραγγελιών, πελατών, προϊόντων και διανομών για παραγωγούς.",
              inLanguage: "el",
              publisher: { "@id": "https://voiceorders.lovable.app/#organization" },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="el">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      if (event === "SIGNED_OUT") queryClient.clear();
      else void queryClient.invalidateQueries();
      void router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <I18nProvider>
        <CompanySync />
        <Outlet />
        <Toaster position="top-center" />
      </I18nProvider>
    </QueryClientProvider>
  );
}
