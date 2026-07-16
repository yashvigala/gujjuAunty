/// <reference types="vite/client" />

// Vite's default ImportMetaEnv has an index signature returning `any`.
// Declaring our env vars here gives them real types instead.
// `string | undefined` is the honest type: nothing guarantees the var exists
// at runtime — main.tsx validates it on startup and narrows it to `string`.
interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
