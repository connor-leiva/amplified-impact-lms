import clsx from 'clsx';
import type { Tier } from '@ai/core';
import { Icon } from '../Icon';
import { Menu } from './Menu';
import { k } from './kit';

// The R2 tier pill (D-160 R2-2): the mockup's `TierPill`, a soft pill that is a menu button. Agent +
// Team is green, Team only amber; the menu checks the current choice. Choosing the other one calls
// `onChange`; choosing the current one does nothing.

const WORDS: Record<Tier, string> = { agent: 'Agent + Team', team: 'Team only' };

export function TierPill({
  tier,
  onChange,
  className,
}: {
  tier: Tier;
  onChange: (t: Tier) => void;
  className?: string;
}) {
  return (
    <Menu
      label="Tier access"
      placement="below-left"
      className={className}
      items={(['agent', 'team'] as const).map((t) => ({
        label: WORDS[t],
        checked: tier === t,
        onSelect: () => {
          if (t !== tier) onChange(t);
        },
      }))}
      trigger={(m) => (
        <button
          type="button"
          className={clsx(k.pl, k.plBtn, tier === 'agent' ? k.ok : k.warn)}
          aria-label={`Tier access: ${WORDS[tier]}`}
          {...m.props}
          onClick={m.toggle}
        >
          {WORDS[tier]}
          <Icon name="r2Chevd" size={11} strokeWidth={2.4} />
        </button>
      )}
    />
  );
}
