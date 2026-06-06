import {
  Aurora,
  Button,
  buttonVariants,
  MetallicPaint,
  PageShell,
} from "@manual.email/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { signOut } from "./actions";
import { AuthForm } from "./auth-form";

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

  return (
    <main className="size-full min-w-screen min-h-screen bg-mist-900 flex items-center justify-center text-white relative">
      <div className="absolute inset-0">
        <Aurora
          colorStops={["#111111", "#222222", "#444444"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.2}
        />
      </div>
      <div className="max-w-270 min-h-screen grid grid-cols-2 border-x border-mist-100/20 relative py-12">
        <div className="col-span-1 flex flex-col items-start relative gap-8 border-r border-mist-100/20">
          <div className="absolute top-0 w-screen h-full border-mist-100/20 border-y -left-[calc(50vw-1080px/2)] pointer-events-none" />
          <div className="w-[300px] h-[80px] relative flex items-start justify-start ml-8 mt-4">
            <div className="-top-[110px] absolute w-[300px] flex items-center justify-center">
              <MetallicPaint
                imageSrc="/logo.svg"
                // Pattern
                seed={11}
                scale={1}
                patternSharpness={1.1}
                noiseScale={0.2}
                // Animation
                speed={0.1}
                liquid={0.99}
                // mouseAnimation={true}
                // Visual
                brightness={1.2}
                contrast={1}
                refraction={0.02}
                blur={0.47}
                chromaticSpread={0.1}
                fresnel={2.1}
                // angle={2}
                waveAmplitude={0.1}
                distortion={0.2}
                contour={0.2}
                // Colors
                lightColor="#ffffff"
                darkColor="#aaaaaa"
                tintColor="#dddddd"
              />
            </div>
          </div>
          <div className="bg-mist-950/80  w-full h-full border-t border-mist-100/20 p-8 flex flex-col items-start gap-8">
            <div className="flex flex-col items-start gap-1">
              <div className="flex">
                {" "}
                From: Rory McMeekin (rory@manual.email)
              </div>
              <div className="">To: You</div>
            </div>
            <div className="space-y-2">
              <p>Hello,</p>
              <p>
                The first email was sent in 1971 -- well before mail merge, drip
                campaigns, and AI agents. For a long time, the way to send
                messages to your friends, family, colleagues, lovers, (and even
                people you looked up to) was email.
              </p>
              <p>
                Somewhere along the way, email stopped being that. It became
                noisy, it became automated, and most of all it stopped being
                delightful.
              </p>
              <p>
                I want to change that. I want something that uses technology for
                the boring bits (filtering and sorting), but that lets me -- and
                me alone -- write my emails.
              </p>
              <p>I want email to be human again.</p>
              <p>Want to join me...?</p>
              {/*<p>Warmest regards,</p>*/}
              <p>Rory</p>
            </div>
          </div>
        </div>
        <div className="col-span-1 p-4 flex flex-col items-center">
          <div className=" bg-black/50 backdrop-blur-md p-4 flex flex-col items-center">
            <p>
              Sign into <strong>manual</strong>
            </p>
            <AuthForm />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;
