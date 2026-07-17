/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_IMAGE_MODEL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_IMAGE_MODEL?: string;
  readonly VITE_ENABLE_TEETH_ML?: string;
  readonly VITE_TEETH_RECON_API_URL?: string;
  readonly VITE_TEETH_DREAMER_API_URL?: string;
  readonly VITE_ROLE_LABELS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
