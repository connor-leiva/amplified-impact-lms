import { beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { NOTES_COPY, canDeleteNotes, canSaveNote, canWriteNotes, noteVM, notesFailure, reasonReady } from './StaffNotes.vm';

const NOW = Date.parse('2026-12-07T16:42:00Z');

describe('StaffNotes.vm (D-158)', () => {
  beforeEach(() => setViewerZone('America/Phoenix'));

  it('saves 1 to 2,000 characters once trimmed', () => {
    expect(canSaveNote('   ')).toBe(false);
    expect(canSaveNote(' a ')).toBe(true);
    expect(canSaveNote('x'.repeat(2000))).toBe(true);
    expect(canSaveNote('x'.repeat(2001))).toBe(false);
    expect(NOTES_COPY.count(48)).toBe('48 of 2,000 characters');
  });

  it('wants a reason of 10 to 500 characters to delete', () => {
    expect(reasonReady('too short')).toBe(false);
    expect(reasonReady('Wrong workspace.')).toBe(true);
    expect(reasonReady('x'.repeat(501))).toBe(false);
  });

  it('lets every Console role write, and only the Owner delete', () => {
    expect(['Owner', 'Admin', 'Support'].map(canWriteNotes)).toEqual([true, true, true]);
    expect(['Owner', 'Admin', 'Support'].map(canDeleteNotes)).toEqual([true, false, false]);
    expect(canWriteNotes('Instructor')).toBe(false);
  });

  it('makes a note line, naming a missing author', () => {
    expect(noteVM({ id: '3', targetType: 'user', targetId: 'u', author: { id: 'st9', name: null }, body: 'Hi', createdAt: NOW })).toEqual({
      key: '3',
      author: 'A former staff member',
      when: expect.stringMatching(/Dec 7/),
      body: 'Hi',
    });
    expect(notesFailure('invalid', 'A note is 1 to 2,000 characters.')).toBe('A note is 1 to 2,000 characters.');
    expect(notesFailure('not_found', '')).toBe('That note or record no longer exists.');
  });
});
