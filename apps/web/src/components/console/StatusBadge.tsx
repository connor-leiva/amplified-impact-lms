import { StatusToken } from '../StatusToken';
import type { TokenGlyph, TokenTone } from '../StatusToken';

// The Console's status badge (D-157): a word and a glyph on the house StatusToken, so a state never
// rests on colour alone. The view-model chooses all three.

export interface StatusBadgeProps {
  label: string;
  tone: TokenTone;
  icon: TokenGlyph;
}

export function StatusBadge({ label, tone, icon }: StatusBadgeProps) {
  return <StatusToken kind="custom" label={label} tone={tone} icon={icon} />;
}
