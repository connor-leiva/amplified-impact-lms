// Self-hosted through @fontsource. Same families the reference loads from Google.
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';

// Alternate typefaces are loaded only when chosen (see lib/prefs.ts).
export const loadAltFont = (font: 'instrument' | 'schibsted') =>
  font === 'instrument'
    ? Promise.all([
        import('@fontsource/instrument-sans/400.css'),
        import('@fontsource/instrument-sans/500.css'),
        import('@fontsource/instrument-sans/600.css'),
        import('@fontsource/instrument-sans/700.css'),
      ])
    : Promise.all([
        import('@fontsource/schibsted-grotesk/400.css'),
        import('@fontsource/schibsted-grotesk/500.css'),
        import('@fontsource/schibsted-grotesk/600.css'),
        import('@fontsource/schibsted-grotesk/700.css'),
      ]);
