import type { Config } from "tailwindcss";
// Whop UI preset provides tokens like gray-a12, text-8, etc.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - package exports a preset config
import whopPreset from "@whop/react/tailwind";

export default {
  presets: [whopPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
} satisfies Config;

