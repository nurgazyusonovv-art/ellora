import type { NextConfig } from "next";

// Vercel'де SUPABASE_URL / SUPABASE_ANON_KEY деп сакталган. Браузер да көрүшү үчүн
// build учурунда NEXT_PUBLIC_* аттарына көчүрөбүз (локалдуу .env.local'дагы эски аттар да иштейт).
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
