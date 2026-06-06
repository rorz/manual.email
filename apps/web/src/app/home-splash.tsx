"use client";

import { Aurora, cn, MetallicPaint } from "@manual.email/ui";
import { useEffect, useState } from "react";
import { AuthForm } from "./auth-form";

type ThemeMode = "light" | "dark" | "auto";
type ResolvedTheme = Exclude<ThemeMode, "auto">;
type MistShade = (typeof mistShades)[number];

type EffectThemeTokens = {
  readonly auroraColorStops: [MistShade, MistShade, MistShade];
  readonly metallicDark: MistShade;
  readonly metallicLight: MistShade;
  readonly metallicTint: MistShade;
};

const themeStorageKey = "manual.email.home-theme";

const mistShades = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

const fallbackMistHex: Record<MistShade, string> = {
  50: "#f9fbfb",
  100: "#f1f3f3",
  200: "#e3e7e8",
  300: "#d0d6d8",
  400: "#9ca8ab",
  500: "#67787c",
  600: "#4b585b",
  700: "#394447",
  800: "#22292b",
  900: "#161b1d",
  950: "#090b0c",
};

const effectThemeTokens: Record<ResolvedTheme, EffectThemeTokens> = {
  dark: {
    auroraColorStops: [950, 800, 700],
    metallicDark: 400,
    metallicLight: 50,
    metallicTint: 200,
  },
  light: {
    auroraColorStops: [50, 200, 300],
    metallicDark: 400,
    metallicLight: 950,
    metallicTint: 800,
  },
};

const themeModes = [
  { label: "☀︎", title: "Light", value: "light" },
  { label: "🌙", title: "Dark", value: "dark" },
  { label: "auto", title: "Auto", value: "auto" },
] satisfies ReadonlyArray<{
  label: string;
  title: string;
  value: ThemeMode;
}>;

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === "light" || value === "dark" || value === "auto";

const readSystemTheme = (): ResolvedTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const parseOklch = (value: string): [number, number, number] | null => {
  const match = value
    .trim()
    .match(
      /^oklch\(\s*([0-9.]+)(%)?\s+([0-9.]+)\s+([0-9.]+)(?:deg)?(?:\s*\/\s*[^)]+)?\s*\)$/i,
    );
  if (!match) return null;

  const [, lightness, percent, chroma, hue] = match;
  if (!(lightness && chroma && hue)) return null;

  return [Number(lightness) / (percent ? 100 : 1), Number(chroma), Number(hue)];
};

const oklchToHex = ([lightness, chroma, hue]: [
  number,
  number,
  number,
]): string => {
  const hueRadians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const toSrgb = (channel: number) => {
    const clamped = Math.min(1, Math.max(0, channel));
    return clamped >= 0.0031308
      ? 1.055 * clamped ** (1 / 2.4) - 0.055
      : 12.92 * clamped;
  };

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
    .map((channel) =>
      Math.round(toSrgb(channel) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
};

const readMistHex = (): Record<MistShade, string> => {
  const styles = window.getComputedStyle(document.documentElement);
  return Object.fromEntries(
    mistShades.map((shade) => {
      const color = styles.getPropertyValue(`--color-mist-${shade}`);
      const parsed = parseOklch(color);
      return [
        shade,
        parsed ? `#${oklchToHex(parsed)}` : fallbackMistHex[shade],
      ];
    }),
  ) as Record<MistShade, string>;
};

export const HomeSplash = () => {
  const [mode, setMode] = useState<ThemeMode>("auto");
  const [mistHex, setMistHex] = useState(fallbackMistHex);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("dark");
  const resolvedTheme = mode === "auto" ? systemTheme : mode;
  const effectTheme = effectThemeTokens[resolvedTheme];
  const effectColor = (shade: MistShade) => mistHex[shade];
  const auroraColorStops = effectTheme.auroraColorStops.map(effectColor) as [
    string,
    string,
    string,
  ];

  useEffect(() => {
    setMistHex(readMistHex());

    const storedTheme = window.localStorage.getItem(themeStorageKey);
    if (isThemeMode(storedTheme)) {
      setMode(storedTheme);
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => setSystemTheme(readSystemTheme());
    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  const chooseTheme = (nextMode: ThemeMode) => {
    setMode(nextMode);
    window.localStorage.setItem(themeStorageKey, nextMode);
  };

  return (
    <main
      className={cn(
        "relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-mist-100 text-mist-950 transition-colors duration-300 dark:bg-mist-900 dark:text-mist-50",
        resolvedTheme === "dark" && "dark",
      )}
      data-resolved-theme={resolvedTheme}
      data-theme-mode={mode}
    >
      <div className="absolute inset-0">
        <Aurora
          amplitude={1}
          blend={0.5}
          colorStops={auroraColorStops}
          speed={0.2}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-12 bottom-28 z-10 border-mist-950/20 border-y dark:border-mist-100/20 md:bottom-12" />
      <div className="relative grid min-h-screen w-full max-w-[1080px] grid-cols-1 border-mist-950/20 border-x pt-12 pb-28 dark:border-mist-100/20 md:grid-cols-2 md:py-12">
        <div className="relative col-span-1 flex flex-col items-start gap-8 border-mist-950/20 dark:border-mist-100/20 md:border-r">
          <div className="relative ml-8 mt-4 flex h-20 w-[300px] items-start justify-start">
            <div className="absolute -top-[110px] flex w-[300px] items-center justify-center">
              <MetallicPaint
                imageSrc="/logo.svg"
                seed={11}
                scale={1}
                patternSharpness={1.1}
                noiseScale={0.2}
                speed={0.1}
                liquid={0.99}
                brightness={1.2}
                contrast={1}
                refraction={0.02}
                blur={0.47}
                chromaticSpread={0.1}
                fresnel={2.1}
                waveAmplitude={0.1}
                distortion={0.2}
                contour={0.2}
                lightColor={effectColor(effectTheme.metallicLight)}
                darkColor={effectColor(effectTheme.metallicDark)}
                tintColor={effectColor(effectTheme.metallicTint)}
              />
            </div>
          </div>
          <div className="flex h-full w-full flex-col items-start gap-8 border-mist-950/20 border-t bg-mist-50/80 p-8 text-mist-950 backdrop-blur-sm dark:border-mist-100/20 dark:bg-mist-950/80 dark:text-mist-50">
            <div className="flex flex-col items-start gap-1 text-mist-700 dark:text-mist-50">
              <div>From: Rory McMeekin (rory@manual.email)</div>
              <div>To: You</div>
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
              <p className="font-sans">
                I want to change that. I want something that uses technology for
                the boring bits (filtering and sorting), but that lets me -- and
                me alone -- write my emails.
              </p>
              <p>I want email to be human again.</p>
              <p>Want to join me...?</p>
              <p>Rory</p>
            </div>
          </div>
        </div>
        <div className="col-span-1 flex flex-col items-center justify-center p-4">
          <AuthForm
            cardClassName="border border-mist-950/20 bg-mist-50 text-mist-950 shadow-2xl shadow-mist-950/15 backdrop-blur-md dark:border-mist-100/20 dark:bg-mist-950/50 dark:text-mist-50 dark:shadow-black/50"
            controlClassName="!border-mist-950/20 !bg-mist-50/75 !text-mist-950 placeholder:!text-mist-500 focus:!border-mist-950/60 dark:!border-mist-100/25 dark:!bg-mist-950/70 dark:!text-mist-50 dark:placeholder:!text-mist-400 dark:focus:!border-mist-100/60"
            errorClassName="!text-red-700 dark:!text-red-200"
            linkClassName="!text-mist-800 dark:!text-mist-200"
            submitClassName="!border !border-mist-950/80 !bg-mist-950 !text-mist-50 hover:!bg-mist-800 dark:!border-mist-50/80 dark:!bg-mist-50 dark:!text-mist-950 dark:hover:!bg-mist-200"
            titleClassName="text-mist-900 dark:text-mist-50"
          />
        </div>
      </div>
      <div className="fixed right-4 bottom-4 z-30 grid grid-cols-3 gap-1 rounded-full border border-mist-950/20 bg-mist-50/70 p-1 shadow-mist-950/15 shadow-xl backdrop-blur-xl dark:border-mist-100/20 dark:bg-mist-950/55 dark:shadow-black/50">
        {themeModes.map((themeMode) => (
          <button
            aria-label={`Use ${themeMode.title.toLowerCase()} theme`}
            aria-pressed={mode === themeMode.value}
            className={cn(
              "grid h-9 min-w-12 place-items-center rounded-full px-3 text-sm transition-colors",
              mode === themeMode.value
                ? "bg-mist-950 text-mist-50 dark:bg-mist-50 dark:text-mist-950"
                : "text-mist-950/65 hover:bg-mist-950/10 dark:text-mist-50/70 dark:hover:bg-mist-50/10",
            )}
            key={themeMode.value}
            onClick={() => chooseTheme(themeMode.value)}
            title={themeMode.title}
            type="button"
          >
            {themeMode.label}
          </button>
        ))}
      </div>
    </main>
  );
};
