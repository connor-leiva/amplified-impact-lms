import { createRoot } from 'react-dom/client';
import { StepPage } from '../src/StepPage.jsx';
import { sampleLabels, sampleStep } from '../src/sample-data.js';
import '../src/motion/ai-motion.css';   // Amplified Impact Motion v1 (brand file, unchanged), loaded first like in the mockup
import '../src/step-page.tokens.css';
import '../src/step-page.css';

// /harness/       the mockup's page, review-only parts included (what the tests compare against the video)
// /harness/?lms   what the LMS ships: no MOCKUP bar, no "Text styles" link or section. The tests add those back
//                 themselves (diff/fixtures.mjs), so this is how a deployed page will be tested.
const lms = new URLSearchParams(location.search).has('lms');
const step = lms ? { ...sampleStep, jumps: sampleStep.jumps.filter((j) => j.id !== 'styles') } : sampleStep;

createRoot(document.getElementById('root')).render(
  <StepPage step={step} labels={sampleLabels} mockFlag={!lms} review={!lms} />,
);
