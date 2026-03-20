/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HAS_BACKEND: string;
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
