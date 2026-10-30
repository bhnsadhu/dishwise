import { permanentRedirect } from "next/navigation";

/** Menus now live on the home screen. */
export default function Page() {
  permanentRedirect("/");
}
