/** Landing `/` → login (proxy handles authenticated redirects elsewhere). */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
