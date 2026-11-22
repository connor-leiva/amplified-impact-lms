// The cohort welcome. The words are `WelcomeCopy` from `@ai/core` (dates already filled, Mountain
// Time). This file is the markup: the same shell as the other emails, with the extra sections the
// welcome needs after the button.

import { Heading, Section, Text } from '@react-email/components';
import type { CSSProperties } from 'react';
import { WELCOME_LOGO_PATH } from '@ai/core';
import type { WelcomeCopy } from '@ai/core';
import { EMAIL_FONT_STACK, EMAIL_TOKENS } from '../tokens';
import { EmailLayout, Para } from './layout';
import { absolute } from './links';

const T = EMAIL_TOKENS;

const h2: CSSProperties = {
  margin: '28px 0 0',
  fontFamily: EMAIL_FONT_STACK,
  fontSize: '18px',
  lineHeight: '24px',
  fontWeight: 600,
  color: T['text-primary'],
};

const stepTitle: CSSProperties = {
  margin: '16px 0 0',
  fontFamily: EMAIL_FONT_STACK,
  fontSize: '14px',
  lineHeight: '20px',
  fontWeight: 600,
  color: T['text-primary'],
};

const rowLabel: CSSProperties = {
  margin: '14px 0 0',
  fontFamily: EMAIL_FONT_STACK,
  fontSize: '14px',
  lineHeight: '20px',
  fontWeight: 600,
  color: T['text-primary'],
};

const fine: CSSProperties = {
  margin: '20px 0 0',
  fontFamily: EMAIL_FONT_STACK,
  fontSize: '12px',
  lineHeight: '18px',
  color: T['text-secondary'],
};

const link: CSSProperties = {
  color: T['text-primary'],
  fontWeight: 600,
};

export interface CohortWelcomeEmailProps {
  subject: string;
  copy: WelcomeCopy;
  appUrl?: string | null;
}

export function CohortWelcomeEmail({ subject, copy, appUrl }: CohortWelcomeEmailProps) {
  const logo = absolute(WELCOME_LOGO_PATH, appUrl);
  return (
    <EmailLayout
      subject={subject}
      preheader={copy.preheader}
      heading={copy.heading}
      eyebrow={copy.eyebrow}
      logoSrc={logo}
      cta={{ label: copy.buttonLabel, href: copy.buttonHref }}
      below={
        <>
          <Para>{copy.orLine}</Para>
          <Heading as="h2" style={h2}>
            {copy.doHeading}
          </Heading>
          {copy.steps.map((step) => (
            <Section key={step.n}>
              <Text style={stepTitle}>
                {step.n} {step.title}
              </Text>
              <Para>{step.body}</Para>
              {step.n === '01' && copy.setPasswordUrl && copy.setPasswordLine ? (
                <Para>
                  {copy.setPasswordLine}{' '}
                  <a href={copy.setPasswordUrl} style={link}>
                    Set Your Password
                  </a>
                </Para>
              ) : null}
            </Section>
          ))}
          <Heading as="h2" style={h2}>
            {copy.weekHeading}
          </Heading>
          <Para>{copy.weekIntro}</Para>
          {copy.rows.map((row) => (
            <Section key={row.label}>
              <Text style={rowLabel}>{row.label}</Text>
              <Para>{row.body}</Para>
            </Section>
          ))}
          {copy.close.map((p) => (
            <Para key={p}>{p}</Para>
          ))}
          <Para>
            {copy.signoffName}
            <br />
            {copy.signoffRole}
          </Para>
          <Text style={fine}>{copy.footer}</Text>
        </>
      }
    >
      <Para>{copy.cohortLine}</Para>
      <Para>{copy.greeting}</Para>
      <Para>{copy.intro[0]}</Para>
      <Para>{copy.intro[1]}</Para>
    </EmailLayout>
  );
}
