import { headers } from "next/headers";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { signOut } from "./actions";
import { AuthForm } from "./auth-form";

/**
 * Splash + auth. Bare-bones by design — the real UI is the user's job; this
 * just exercises BetterAuth username+password so the rest of the app is testable.
 */
export default async function Home() {
  const session = await getAuth().api.getSession({ headers: await headers() });

  if (session) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 p-8">
        <h1 className="text-2xl font-semibold">manual.email</h1>
        <p>Signed in as {session.user.name}</p>
        <Link className="text-blue-600 underline" href="/inbox">
          Go to inbox →
        </Link>
        <form action={signOut}>
          <button
            className="rounded border border-neutral-300 px-4 py-2"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">manual.email</h1>
      <p>Pick a username to get your @manual.email address.</p>
      <AuthForm />
    </main>
  );
}
