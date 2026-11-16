// The web app's render modules import their SVG files as strings (`?raw`, a Vite feature vitest
// resolves too). `analytics.test.ts` renders the real www pages from them (D-159), so the API's
// typecheck needs the declaration `vite/client` gives the web app.
declare module '*?raw' {
  const content: string;
  export default content;
}
