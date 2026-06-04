import { headers } from "next/headers";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { signOut } from "./actions";
import { AuthForm } from "./auth-form";

/**
 * Splash + auth. Bare-bones by design — the real UI is the user's job; this
 * just exercises BetterAuth email+password so the rest of the app is testable.
 */
export default async function Home() {
  const session = await getAuth().api.getSession({ headers: await headers() });

  if (session) {
    return (
      <main>
        <p>Signed in as {session.user.email}</p>
        <Link href="/inbox">Go to inbox →</Link>
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <h1>manual.email</h1>
      <AuthForm />
    </main>
  );
}
