import { json, readJson, withUser } from "@/lib/api";
import { getMenu, listMenus, saveMenu } from "@/lib/db/repo";

export const GET = withUser(async ({ user, db, req }) => {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Unknown menu." }, 404);
    const menu = await getMenu(db, user.id, id);
    return menu ? json({ menu }) : json({ error: "Unknown menu." }, 404);
  }
  return json({ menus: await listMenus(db, user.id) });
});

export const POST = withUser(
  async ({ user, db, req }) => {
    const body = (await readJson(req)) as { menu?: unknown; source?: string };
    const source = body.source === "scan" || body.source === "sample" ? body.source : "manual";
    return json({ menu: await saveMenu(db, user.id, body.menu, source) });
  },
  { write: true },
);
