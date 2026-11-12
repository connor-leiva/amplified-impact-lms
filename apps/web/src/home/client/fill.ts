// The one way a string from the markup gets a number put in it: `{name}` placeholders, written by the
// build (`../content.ts`) and filled here. The build's tests fill them with the same function, so a
// template that reads right in a test reads right in the browser.

/** Replace each `{name}` with its value; a placeholder with no value is left as it is. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/** "$1,491": a whole-dollar price, as the page prints it (the same as `../prices.ts`'s `usd`). */
export const usd = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;
