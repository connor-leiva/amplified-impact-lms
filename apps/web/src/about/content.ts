// Every word on /about (DECISIONS.md D-117).
//
// THE SOURCES. Spring's plan (docs/SPRING-PLAN.md, "About (/about)"): Spring as the face, Connor as
// co-founder, the Utah Life story, why we built this; and its "Positioning": an AI coaching and training
// company, real estate the first market, the proof that AI runs inside our own businesses. The overnight
// brief's bios, word for word, with one cut: Spring's names "The Forum", which no public page may, so
// "founded The Forum and Activated Agents" reads "founded Activated Agents" here (a test holds the rest
// verbatim). Their own photos only, never stock or generated faces (the brief).
//
// Spring's voice: contractions, short sentences, lead with a statement. No em dashes, no exclamation
// marks. No testimonials, no results promises. Spring reviews these words before they go live.

export const ABOUT_META = {
  title: 'About · Amplified Impact',
  description:
    'Spring Bengtzen and Connor Leiva, and why we built Amplified Impact: AI coaching and training for business owners and their teams.',
  path: '/about',
} as const;

export const ABOUT_HERO = {
  eyebrow: 'About',
  title: 'We build AI into our own businesses first. Then we teach it.',
  lede: 'Amplified Impact is an AI coaching and training company. Right now we’re doing it for real estate, because that’s the business we run every day.',
} as const;

/** The photos: Spring's Live Utah portrait here (the homepage uses her other one), and Connor's. */
export const ABOUT_PHOTOS = {
  spring: { src: '/img/team/spring-bengtzen-2.jpg', width: 800, height: 1036, alt: 'Spring Bengtzen' },
  connor: { src: '/img/team/connor-leiva.jpg', width: 1000, height: 1000, alt: 'Connor Leiva' },
} as const;

/** The hero's photo: the two of them on stage together, Spring on the left and Connor on the right. */
export const ABOUT_HERO_PHOTO = {
  src: '/img/team/spring-and-connor.jpg',
  width: 1000,
  height: 1250,
  alt: 'Spring Bengtzen and Connor Leiva on stage together',
} as const;

/** The overnight brief's bios. Spring's has its one "Forum" phrase cut; Connor's is verbatim. */
export const BIOS = {
  spring: {
    name: 'Spring Bengtzen',
    role: 'Founder and CEO, The Utah Life Real Estate Group',
    body: 'Spring Bengtzen is the founder and CEO of The Utah Life Real Estate Group, an eXp Realty team based in Farmington, Utah, and the founder of Spring B, where she coaches real estate team owners. Her team is 100 agents closing 700+ homes a year. She has more than 20 years in the business and was named to REALTOR Magazine’s 30 Under 30 in 2010. She also leads Spring B Coaching, co-leads be Collective, and founded Activated Agents, along with mortgage and title businesses.',
  },
  connor: {
    name: 'Connor Leiva',
    role: 'Co-founder, Amplified Impact',
    body: 'Connor Leiva is a Dallas-based real estate operator and a licensed Texas sales agent with Owns the Home Group and eXp Realty. He has spent more than a decade in the industry, starting as a data analyst at RE/MAX Headquarters, later leading strategic growth work at Realogy for the Better Homes and Gardens Real Estate and ERA networks, and serving since 2021 as Executive Director of Onboarding & Launch at PLACE. He holds an MBA from the University of Denver and a master’s in Organization Development and Change from Penn State, and he also coaches leaders on real estate systems and business planning. He is co-founder of Amplified Impact.',
  },
} as const;

export const STORY = {
  heading: 'The Utah Life story',
  body: [
    'The Utah Life Real Estate Group is an eXp Realty team in Farmington, Utah, with mortgage, title and coaching businesses beside it.',
    // Spring's "Our proof is that AI runs inside our businesses", and no more than that: no results claim.
    'It’s where we put AI to work first. What works there is what we teach.',
  ],
} as const;

export const WHY = {
  heading: 'Why we built this',
  body: [
    'We wanted a business where AI does real work, not a tool we open now and then.',
    'So we built it into how we run, one job at a time. Then we wrote it down as skills anyone on a team can set up, and we teach them live.',
    'Real estate comes first because it’s the business we know. The skills that aren’t about real estate work for any owner.',
  ],
} as const;

/**
 * The v2 mockup's rings beside "Why we built this", center out: a drawing, hidden from screen readers.
 * NEW COPY FOR SPRING'S REVIEW, each a short form of the live words above (the center keeps the group's
 * full name, never "Utah Life" alone).
 */
export const V2_RINGS = [
  'The Utah Life Real Estate Group',
  'Mortgage, title and coaching',
  'Skills anyone can set up',
  'Taught live',
  'Any owner',
] as const;

export const ABOUT_END = {
  heading: 'Start with 5 free skills.',
  primary: 'Get 5 Free Skills',
  secondary: 'See the Programs',
} as const;
