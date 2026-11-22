// D-236: the seat card form's reads and writes, as the package's `useForm` drives them: loaded from
// `GET /api/seat-card`, saved with `PUT /api/seat-card` as you go, marked ready (the operator) or signed (the owner)
// the same way, and printed with `GET /api/seat-card/pdf`. A refusal carries the server's words to the drawer's foot.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SeatCard } from '@ai/core/course-types';
import { useForm, FormRefusal } from './FormDrawer';
import type { FormApi } from './FormDrawer';
import { seatCardDef, seatCardInitial } from './seatcard.vm';
import type { SeatCardBody, SeatCardRole } from './seatcard.vm';
import type { FormAnswers } from './types';

/** The drawer's words when the server said nothing (a dropped connection). */
export const SEAT_CARD_FAILED = 'That didn’t save. Try again.';

const path = (p: string, moduleId: string): string => `${p}?moduleId=${encodeURIComponent(moduleId)}`;

/** The card's answers as text: the drawer's text fields only ever hold strings. */
const textOf = (a: FormAnswers): Record<string, string> => Object.fromEntries(Object.entries(a).filter((e): e is [string, string] => typeof e[1] === 'string'));

async function refusal(res: Response): Promise<FormRefusal> {
  const body = (await res.json().catch(() => ({}))) as { error?: unknown };
  return new FormRefusal(typeof body.error === 'string' && body.error ? body.error : SEAT_CARD_FAILED);
}

/** Download PDF: the server makes the file (a second or two); the browser saves it under the route's name. */
export async function downloadSeatCardPdf(moduleId: string, fallback: string): Promise<void> {
  try {
    const res = await fetch(path('/api/seat-card/pdf', moduleId), { credentials: 'include' });
    if (!res.ok) throw new Error(`GET /api/seat-card/pdf ${res.status}`);
    const href = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = href;
    a.download = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? fallback;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  } catch (err) {
    console.error(err);
  }
}

/**
 * The week's seat card as the drawer drives it. `role` is the viewer's (core's rules on their team role): the owner's
 * submit signs, the operator's marks it ready, and an agent's drawer is locked. One card per team per week; two people
 * editing at once, the last save wins, as the intake.
 */
export function useSeatCardForm(moduleId: string, card: SeatCard, at: { week: number; step: number; signLabel?: string }, role: SeatCardRole, now: number): FormApi {
  const [state, setState] = useState<Pick<SeatCardBody, 'signedAt' | 'signedBy'>>({ signedAt: null, signedBy: null });
  const { week, step, signLabel } = at;
  const def = useMemo(() => seatCardDef(card, { week, step, ...(signLabel ? { signLabel } : {}) }, role, state), [card, week, step, signLabel, role, state]);
  const put = useCallback(
    async (answers: FormAnswers, flags: { ready?: true; sign?: true }) => {
      let res: Response;
      try {
        res = await fetch('/api/seat-card', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ moduleId, answers: textOf(answers), ...flags }),
        });
      } catch {
        throw new FormRefusal(SEAT_CARD_FAILED);
      }
      if (!res.ok) throw await refusal(res);
      const body = (await res.json().catch(() => null)) as SeatCardBody | null;
      if (body) setState((s) => (s.signedAt === (body.signedAt ?? null) && s.signedBy === (body.signedBy ?? null) ? s : { signedAt: body.signedAt ?? null, signedBy: body.signedBy ?? null }));
    },
    [moduleId],
  );
  const f = useForm({
    form: def,
    initial: { status: 'new', answers: {} },
    onSave: role === 'agent' ? undefined : (a) => put(a, {}),
    onSubmit: role === 'agent' ? undefined : (a) => put(a, role === 'owner' ? { sign: true } : { ready: true }),
    onDownloadPdf: () => downloadSeatCardPdf(moduleId, `${card.seat} Seat Card.pdf`),
  });
  const reset = useRef(f.reset);
  reset.current = f.reset;
  const nowAt = useRef(now);
  nowAt.current = now;
  useEffect(() => {
    let alive = true;
    void fetch(path('/api/seat-card', moduleId), { credentials: 'include' })
      .then((res) => (res.ok ? (res.json() as Promise<SeatCardBody>) : null))
      .then((body) => {
        if (!alive || !body) return;
        setState({ signedAt: body.signedAt ?? null, signedBy: body.signedBy ?? null });
        reset.current(seatCardInitial(body, role, nowAt.current));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [moduleId, role]);
  return f;
}
