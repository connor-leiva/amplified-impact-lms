// S3, "So what’s a skill?" (`section.wsk`, #skills): a chat that starts over every time, next to a skill
// that was set up once (brief § 4, S3).
//
// FROM THE MOCKUP, WITH THE SITE'S RULES ON TOP:
//   - the band the mockup draws light is `.inverse`, so it swaps with the page's theme (Connor's D8);
//   - the chat's 12 is an illustration, so the kit's "Made-up example" tag sits right by it (C15);
//   - the markup is the settled state: the AI's reply shows, and 12 and 1 are final. The script may
//     replay the chat's two beats and count the figures up, only with motion allowed.

import { esc } from '../../../ai101/render';
import { exTag } from '../../../kit/parts';
import { SKILL } from '../content';
import { glyph, ringDot } from '../icons';

const count = (n: number) => `<span class="cvs-n tnum" data-v3-count="${n}">${n}</span>`;

function chat(): string {
  const c = SKILL.chat;
  return [
    `<div class="cvs-panel cvs-chat">`,
    `<div class="cvs-bar"><span class="mono cvs-tag">${esc(c.tag)}</span><span class="mono cvs-meta cvs-new">${esc(c.meta)}</span></div>`,
    `<div class="cvs-thread" data-beat="2">`,
    `<p class="cvs-msg cvs-you"><span class="mono">${esc(c.you)}</span>${esc(c.youSays)}</p>`,
    `<p class="cvs-msg cvs-ai"><span class="mono">${esc(c.ai)}</span>${esc(c.aiSays)}</p>`,
    `</div>`,
    `<div class="cvs-foot">${count(c.count)}<span class="cvs-k">${esc(c.countLabel)}${exTag()}</span></div>`,
    `</div>`,
  ].join('');
}

function skill(): string {
  const s = SKILL.skill;
  return [
    `<div class="cvs-panel cvs-skill">`,
    `<div class="cvs-bar"><span class="mono cvs-tag">${esc(s.tag)}</span><span class="mono cvs-meta">${esc(s.meta)}</span></div>`,
    `<p class="cvs-name">${ringDot(18)}${esc(s.name)}</p>`,
    `<ul class="cvs-learned" role="list">${s.learned
      .map((l) => `<li><span class="cvs-ok" aria-hidden="true">${glyph('check', 12)}</span>${esc(l)}</li>`)
      .join('')}</ul>`,
    `<div class="cvs-week"><span class="mono cvs-week-k">${esc(s.week)}</span><span class="cvs-days" role="img" aria-label="${esc(
      s.weekLabel,
    )}">${s.days.map((d) => `<span class="cvs-day"><span class="mono">${esc(d)}</span></span>`).join('')}</span></div>`,
    `<div class="cvs-foot">${count(s.count)}<span class="cvs-k">${esc(s.countLabel)}</span></div>`,
    `</div>`,
  ].join('');
}

export function whatsASkill(): string {
  const s = SKILL;
  return [
    `<section id="skills" class="sec wsk inverse" aria-labelledby="wsk-title">`,
    `<div class="wrap wsk-grid">`,
    `<div class="rv wsk-copy"><p class="eb eb-mark">${ringDot(22)}<span>${esc(s.eyebrow)}</span></p><h2 id="wsk-title" class="h-section">${esc(
      s.title,
    )}</h2>${s.intro.map((p) => `<p class="intro">${esc(p)}</p>`).join('')}</div>`,
    `<div class="rv wsk-demo" style="--d:120ms" data-chat><div class="cvs">${chat()}${skill()}</div></div>`,
    `</div>`,
    `</section>`,
  ].join('');
}
