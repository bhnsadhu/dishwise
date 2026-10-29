import { getAuth } from "@/lib/auth/server";

const unavailable = () => Response.json({ error: "Accounts aren't configured on this deployment." }, { status: 503 });

type Handler = (req: Request, ctx: { params: Promise<{ path: string[] }> }) => Promise<Response>;
const handlers = () => getAuth()?.handler() as Record<string, Handler> | undefined;
const route = (method: string): Handler => (req, ctx) => {
  const h = handlers()?.[method];
  return h ? h(req, ctx) : Promise.resolve(unavailable());
};

export const GET = route("GET");
export const POST = route("POST");
export const PUT = route("PUT");
export const PATCH = route("PATCH");
export const DELETE = route("DELETE");
