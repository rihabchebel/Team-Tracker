// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_TITLE?: string;
  // Add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}