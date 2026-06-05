declare module 'react';
declare module 'react-dom';
declare module 'react-dom/client';
declare module 'react/jsx-runtime';
declare module 'html2canvas';
declare module 'jspdf';

// Minimal JSX namespace for TypeScript strict mode
declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
    readonly VITE_EDITOR_EMAIL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: unknown;
    }
  }
}

export {};
