import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/help")({ server: { handlers: { POST: async ({ request }) => {
  const { handleHelp } = await import("@/lib/help-ai/help.server");
  return handleHelp(request);
} } } });