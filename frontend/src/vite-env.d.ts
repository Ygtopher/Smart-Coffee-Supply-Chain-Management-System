/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Allow importing CSS files in TypeScript
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// Allow importing SVG files
declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// Allow importing CSV files
declare module '*.csv' {
  const content: string;
  export default content;
}
