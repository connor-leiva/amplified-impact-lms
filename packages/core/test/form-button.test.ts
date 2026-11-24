// D-245: a Form button says what it does, and a label staff set wins.
import { describe, expect, it } from 'vitest';
import { FORM_BUTTON_LABEL, FORM_LABEL_UNSET, formButtonLabel, ownFormLabel } from '../src/form-button';

describe('a Form button’s words (D-245)', () => {
  it('says what each form does when staff set no label', () => {
    expect(formButtonLabel({ formId: 'intake', label: '' })).toBe('Open and Submit the Intake Form');
    expect(formButtonLabel({ formId: 'stack-card', label: '' })).toBe('Open Your Stack Card');
    expect(formButtonLabel({ formId: 'seat-card', label: '' })).toBe('Fill In Your Seat Card');
    expect(formButtonLabel({ formId: 'intake' })).toBe('Open and Submit the Intake Form');
    expect(formButtonLabel({ formId: 'intake', label: null })).toBe('Open and Submit the Intake Form');
    expect(formButtonLabel({ formId: 'seat-card', label: '   ' })).toBe('Fill In Your Seat Card');
  });

  it('treats the builder’s old fill, “Open the form”, as no label', () => {
    expect(formButtonLabel({ formId: 'intake', label: FORM_LABEL_UNSET })).toBe(FORM_BUTTON_LABEL.intake);
    expect(formButtonLabel({ formId: 'stack-card', label: ' Open the Form ' })).toBe(FORM_BUTTON_LABEL['stack-card']);
  });

  it('reads the label staff set: none for blank or the old fill, else as typed', () => {
    expect(ownFormLabel(undefined)).toBe('');
    expect(ownFormLabel('Open the form')).toBe('');
    expect(ownFormLabel('Open the seat card ')).toBe('Open the seat card ');
  });

  it('keeps a label staff set, trimmed', () => {
    expect(formButtonLabel({ formId: 'intake', label: 'Start Your Intake' })).toBe('Start Your Intake');
    expect(formButtonLabel({ formId: 'seat-card', label: ' Open the seat card ' })).toBe('Open the seat card');
  });

  it('never says Download, and carries no em dash', () => {
    for (const label of Object.values(FORM_BUTTON_LABEL)) {
      expect(label).not.toMatch(/download/i);
      expect(label).not.toContain('—');
    }
  });
});
