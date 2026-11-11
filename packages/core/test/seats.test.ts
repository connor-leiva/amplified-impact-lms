// D-081, built in D-120: a team's role caps come from its plan's seats.
import { describe, expect, it } from 'vitest';
import { seatCaps, seed } from '../src';
import type { Db, Learner } from '../src';

const owner: Learner = { id: 'u_o', name: 'O', email: 'o@example.test', tier: 'team', role: 'Team Owner', teamId: 't', cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} };
const ops: Learner = { ...owner, id: 'u_ops', email: 'ops@example.test', role: 'Operations Lead' };
const team = (seats: number) => ({ id: 't', seats });
const db = (...users: Learner[]): Pick<Db, 'users'> => ({ users });

describe('seatCaps', () => {
  it('keeps the prototype’s caps: seven seats with an operations lead hold five agents', () => {
    const proto = seed('live');
    const northline = proto.teams.find((t) => t.id === 'northline')!;
    expect(northline.seats).toBe(7);
    expect(seatCaps(proto, northline)).toEqual({ 'Team Owner': 1, 'Operations Lead': 1, 'Sales Agent': 5 });
  });

  it('gives the Amplified Team Plan its 15 or 40 agents', () => {
    expect(seatCaps(db(owner), team(16))['Sales Agent']).toBe(15);
    expect(seatCaps(db(owner), team(41))['Sales Agent']).toBe(40);
  });

  it('shares the seats: an operations lead takes one an agent would have had', () => {
    expect(seatCaps(db(owner, ops), team(16))).toEqual({ 'Team Owner': 1, 'Operations Lead': 1, 'Sales Agent': 14 });
    expect(seatCaps(db(owner, ops), team(41))['Sales Agent']).toBe(39);
  });

  it('gives two seats (Amplified Insiders, the AI Accelerator) one more person, and never a negative cap', () => {
    expect(seatCaps(db(owner), team(2))).toEqual({ 'Team Owner': 1, 'Operations Lead': 1, 'Sales Agent': 1 });
    expect(seatCaps(db(owner, ops), team(2))['Sales Agent']).toBe(0);
    expect(seatCaps(db(owner, ops), team(1))['Sales Agent']).toBe(0);
  });
});
