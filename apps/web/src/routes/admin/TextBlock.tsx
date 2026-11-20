import type { ContentBlock } from '@ai/core/course-types';
import type { RichText } from '@ai/core/rich-text';
import { RichField } from './RichField';

type Block = Extract<ContentBlock, { type: 'text' }>;

function withRich(text: string, rich?: RichText): Block {
  return rich ? { type: 'text', text, rich } : { type: 'text', text };
}

export function TextBlock({ block, label, onChange }: { block: Block; label: string; onChange: (b: Block) => void }) {
  return <RichField label={label} plain={block.text} rich={block.rich} onChange={(text, rich) => onChange(withRich(text, rich))} />;
}
