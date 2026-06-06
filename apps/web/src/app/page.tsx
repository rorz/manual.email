import { Button, buttonVariants, PageShell } from "@manual.email/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { signOut } from "./actions";
import { HomeSplash } from "./home-splash";

/**
 * Splash + auth. Bare-bones by design — the real UI is the user's job; this
 * just exercises BetterAuth username+password so the rest of the app is testable.
 */
const Home = async () => {
  const session = await getAuth().api.getSession({ headers: await headers() });

  if (session) {
    return (
      <PageShell className="mx-auto max-w-2xl items-start gap-4 bg-white p-8">
        <h1 className="text-2xl font-semibold">manual.email</h1>
        <p>Signed in as {session.user.name}</p>
        <Link className={buttonVariants({ variant: "link" })} href="/inbox">
          Go to inbox →
        </Link>
        <form action={signOut}>
          <Button type="submit">Sign out</Button>
        </form>
      </PageShell>
    );
  }

  return <HomeSplash />;
};

export default Home;
