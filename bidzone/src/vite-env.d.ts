/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** REST API origin, no trailing slash (e.g. https://api.example.com). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
