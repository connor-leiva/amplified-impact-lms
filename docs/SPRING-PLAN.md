# For Claude

You are working in `connor-leiva/amplified-impact-lms`. Ampy (Grok Bot) is project-managing this build for Connor. This file is Spring Bengtzen's plan dated November 10, 2026, rewritten with Connor's approved offer names. Ampy has the verbatim original if you need it. Stripe object changes are Ampy's job, not yours.

## Working rules

- Railway auto-deploys `main`. Open one pull request per logical chunk. Never merge. Ampy reviews each PR; Connor approves the merge.
- The host split lives in `apps/api/src/routes/marketing.ts`. Keep it. `www.amplifiedimpact.io` serves marketing pages; `learn.amplifiedimpact.io` serves the LMS. `www` must never serve the LMS.
- Keep the current design system (colors, fonts, visual style). This is a structure and copy pass, not a visual redesign.
- Spring reviews all new copy before it is live. Ship new customer-facing words behind review (leave them on the PR, a draft route, or an equivalent preview). Do not put unreviewed copy on `main`.
- Never invent testimonials, photos, or numbers. Use clearly labeled placeholders until Connor or Spring send the real ones.
- Stripe wiring changes are done by Ampy. Do not create, update, or delete Stripe products, prices, Payment Links, coupons, customers, or portal configurations. Do not invent Stripe IDs or paste secret keys. If website code has hardcoded lookup keys, Payment Link URLs, or `trial_end` unix timestamps (today those pins are May 3, 2027 = `1809320400` and January 26, 2027 = `1800943200`), list the call sites in the PR and wait for Ampy to confirm the new values before changing them.
- Do not change the `/agreement` text. It is attorney-approved. If a line now conflicts with this plan, quote it in your PR report. See "Agreement conflicts" at the end of this file.
- Do not mention "Forum" on public pages. Anyone can buy a founding seat while seats last.
- Open decisions stay open. Use the `[OPEN: ...]` placeholders. Do not invent a training day and time, a payment plan for $9,997, a 30-vs-56 cut, a Grok Bot page split, or an end date for Team Plan founding rates.
- No em dashes. Spring's voice: contractions, short sentences, about a 4th grade reading level, lead with a statement, no victim language. Mobile first: thumb-sized buttons, text at least 16px, nothing scrolls sideways.
- Keep and link the existing `/voice-profile` page and AI 101 registration at `ai.springb.co` from Free Resources. Keep `/privacy`. Support on thank-you pages: `support@amplifiedimpact.io`.

## Offer names (locked)

Connor kept these names. Use them everywhere a visitor or a cart sees an offer name, including buttons such as "Get Amplified Insiders" (not "Get The Skills Library").

| Spring's name in the original plan | Connor's name | Route / notes |
| --- | --- | --- |
| Team Owner AI Build | Amplified AI Accelerator | Sales page stays `/team-build` |
| Agent Accelerator (solo, $79/mo or $790/yr) | Amplified Agent Plan | Sales page stays `/agents` |
| Agent Accelerator for Teams | Amplified Team Plan | Sales page stays `/teams` |
| The Skills Library (the $1,997/yr or $197/mo purchase) and the $197/mo membership | Amplified Insiders | One offer, yearly or monthly. The product name "Amplified Skill Library" / "The Skills Library" is retired. |
| Morning Brief | Morning Brief | Unchanged |
| The catalog of skills (the place) | the Library | Route stays `/library`. Main nav and page title: The Library. This is a place, not a purchasable offer. |

"I just want the skills" on the pricing picker can stay. That is a path label, not an offer name. Locked-skill buy buttons: "Buy this skill for $37" or "Get Amplified Insiders."

## Phases and deadlines

**Phase 1, by Thursday, November 12, 2026, before the Forum**

1. Stripe carts (Ampy, not Claude): Amplified AI Accelerator ($7,500 or 2 pays of $3,750), Amplified Insiders ($1,997 a year, or $197 a month with a 3 month minimum), and Amplified Team Plan (first 3 months paid today, $1,491 or $2,391, then monthly from April 4). Do not point Forum CTAs at the current live Skill Library $2,000 checkout or the current Team Plan copy that says nothing is charged today and the first charge is January 26, 2027. Wire buttons to Payment Link URLs Ampy will supply (config or env), or use clearly labeled placeholders.
2. One simple offer page behind the Forum QR code with those three offers and prices showing. Prefer updating the existing `/offer` or `/forum` page the QR already uses rather than inventing a new URL. Say which you chose.
3. Welcome email and intake form for each offer. Draft website thank-you and next-step copy in the PR. GoHighLevel sequences are owned by Connor; do not send email yourself.
4. Refund wording from the attorney and the Forum revenue split: not Claude's job.

**Phase 2, by Monday, November 30, 2026, when founding prices close**

5. Homepage hero, proof strip, and Meet Spring and Connor (Spring reviews the copy first).
6. Pricing page (`/pricing`) with the picker and all offers.
7. Library gating: 5 free, locks, buy buttons. Settle 30 skills versus 56 first (`[OPEN]`).
8. Amplified AI Accelerator sales page (`/team-build`) with the countdown and seats left.
9. Office hours form, recording setup, and attendance tracking before December 3.

**Phase 3, by early January 2027**

10. Amplified Agent Plan (`/agents`) and Amplified Team Plan (`/teams`) pages and carts, live before January 4. The agent starter path is due December 14 for the December bonus.
11. Free Resources page (`/free`), opt-ins with agent and team tags, and the GoHighLevel sequences (Connor owns GHL).
12. Rewrite every skill card and skill page to lead with what it does.
13. Free Morning Brief Grok Bot template, then the agent and team owner versions.
14. AI Bootcamp page and cart by January 25.

## Suggested PR chunks

One PR per chunk. Never merge.

1. Forum offer page (Phase 1)
2. Homepage rewrite
3. `/pricing`
4. Library gating and rename from The Free Library to The Library
5. `/team-build` sales page
6. `/agents`
7. `/teams`
8. `/free` and `/about`
9. Skill card and skill page rewrites (may be batched)
10. Morning Brief
11. AI Bootcamp page (later)

## Ask Connor for these before treating them as live

- Photos of Spring and Connor for the hero and About page. Use a clearly named, easy-to-swap placeholder (no stock photos of people) until they arrive.
- Testimonials (3 to 5 from AI 101 attendees and Utah Life agents), with written permission to use each name, photo, and quote. If they are not ready, launch without them and lead with confirmed Utah Life numbers only. Never invent quotes or results.
- Confirmation of the Utah Life numbers in Spring's draft: a 100 agent team, closing 700+ homes this year.
- Confirmation of the 8 Amplified AI Accelerator skills. Draft placeholder list: Team AI Brain, FUB Automation Audit, FUB Pipeline Review, Agent 1:1 Prep, L10 Meeting Prep, Team Playbook Builder, Recruiting Prep, Lead-Source ROI.
- Day and time for the weekly agent training, starting the week of January 4.
- Also ask before cutting the library down: 30 skills versus the 56 now on the site.

The rewritten plan follows.

---

# Amplified Impact: Offers, Funnel and Website Build

Rewritten from Spring Bengtzen's plan dated Nov 10, 2026, using Connor's approved offer names. Routes are unchanged.

## Summary

Connor, the build is strong. The library alone is a real asset. The change is in what the site says first and how people buy. Right now amplifiedimpact.io reads like software. It should read like what we are: AI coaching, training and prompts, built inside a 100 agent team.

This is everything in one place: the offers and prices, how each program runs, office hours, the funnel and launch calendar, the website changes, and a full build spec with a launch checklist. Decisions still open are at the bottom.

Five changes:

1. The hero says what Amplified Impact is in one line: AI coaching and training.
2. Spring and Connor show up on the page, with Utah Life as proof.
3. Four clear ways to buy, with prices showing: Amplified AI Accelerator, Amplified Agent Plan, Amplified Team Plan, and Amplified Insiders.
4. The library shows all skills. 5 are free. The rest are locked and buyable one at a time or as Amplified Insiders.
5. Free resources become lead magnets, split by agent and team owner so the list stays segmented.

## Positioning

Brand broad, offer narrow. Amplified Impact is an AI coaching and training company. Real estate is the first market we serve, not the whole identity.

- Keep "real estate" out of the name, logo and domain. Put it in the hero line, the packages and the library.
- Our proof is that AI runs inside our businesses: Utah Life closing 700+ homes this year, plus title, mortgage and coaching. That story works for any owner.
- Build the library by job, not by industry. General skills (voice profile, meeting follow-through, P&L review, L10 prep) stay general. Real estate skills get a Real Estate track tag so we can add a Mortgage or Coaching track later without a rebuild.
- Next markets, when real estate proves it: mortgage, title, insurance and coaching. Expand on proof, not on a date.

Model to study: Callan Faulkner's The Uncommon Business (https://theuncommonbusiness.co/). Her first two lines name the pain and say what they do. Then two doors (cohort waitlist and a self-paced lab with ready-to-copy prompts and skills), a Meet Callan section, testimonials with dollar results, and one free playbook as the lead magnet.

What to cut from the hero: "AI that drafts the paperwork. You keep the decisions." Keep that idea, but move it down the page as the trust section. Also drop "AI training software" from the pricing page.

## Site map

Eight pages. Main nav: Programs, The Library, Free Resources, About, and a Get 5 Free Skills button.

| Page | Suggested URL | What it does |
| --- | --- | --- |
| Home | / | Says what we are, shows proof, routes to the four offers and the free skills |
| Programs and Pricing | /pricing | All four offers side by side with prices showing |
| Amplified AI Accelerator | /team-build | Sales page for the 8 week, 8 skill live build for team owners, with cart or waitlist |
| Amplified Team Plan | /teams | Team plan sales page, with sizes and the owner call |
| Amplified Agent Plan | /agents | Agent program sales page at $79 a month |
| The Library | /library | Every skill visible. 5 free, the rest locked with buy buttons |
| Free Resources | /free | Lead magnets, split For Agents and For Team Owners |
| About | /about | Spring and Connor, the Utah Life story, why we built this |

Keep the existing /voice-profile page and AI 101 registration (ai.springb.co) and link both from Free Resources.

## Homepage outline

Nine sections, top to bottom. The copy is a draft. Spring wants to review the final words before they go live.

1. Hero
   - Headline: AI coaching and training for business owners and their teams.
   - Subhead: We teach you to build AI into how you work, with live coaching, ready to use skills and prompts. Right now we're doing it for real estate, because that's the business we run every day.
   - Buttons: Get 5 Free Skills, See the Programs.
   - Photo of Spring and Connor, not a mock offer card.
2. Proof strip
   - Built inside Utah Life, a 100 agent team closing 700+ homes this year. Add AI 101 attendance once it's final.
3. The shift
   - Using AI as a tool vs. running a business where AI does real work. A two column contrast, Callan style.
4. Four ways in
   - Cards for Amplified AI Accelerator, Amplified Agent Plan, Amplified Team Plan and Amplified Insiders, each with its price and one button.
5. The Library preview
   - The four groups that are already on the page (buyer's agents, listing agents, team owners, content and your week). Free skills get a Free tag, the rest get a lock. Link to the full library.
6. Trust section
   - Move the current hero idea here: The AI drafts. You check, then send. Keep Run, Draft and Own.
7. Free resources
   - Two columns: For Agents and For Team Owners. Name and email to unlock.
8. Meet Spring and Connor
   - Short bios. Spring is the face. Connor is introduced as co-founder of Amplified Impact, an AI consulting firm that specializes in real estate.
9. Testimonials and final call to action
   - Real quotes with numbers once we have them. End with Get 5 Free Skills and See the Programs.

## Offers and pricing

Amplified Agent Plan and Amplified Team Plan are the same product, priced by seat. An individual agent gets exactly what a team's agents get. Teams get a lower price per agent and an owner view. Every price shows on the page. No more "price shows on the payment page."

| Offer | Who it's for | What's included | Price | Terms |
| --- | --- | --- | --- | --- |
| Amplified AI Accelerator | Team owners and ops leads on Follow Up Boss | Both skill sets, 8 weekly 90 minute live builds on Wednesdays from December 2, weekly 60 minute office hours on Thursdays, 90 days of new skills, then Amplified Insiders at $197 a month | $7,500 founding price (or 2 pays of $3,750), then $9,997 | 10 founding seats, first build Wednesday, December 2, sold as a cohort, founding price ends November 30 |
| Amplified Agent Plan | Individual agents | Every agent skill, recorded starter path, weekly live agent coaching call | $79 a month, or $790 a year | Cancel anytime |
| Amplified Team Plan, up to 15 agents | Team owners | Everything the Amplified Agent Plan includes, for every agent, plus logins and a usage view for the owner | $497 a month | 3 month minimum |
| Amplified Team Plan, 16 to 40 agents | Team owners | Everything above, plus a monthly owner call on who's using it | $797 a month | 3 month minimum |
| Amplified Team Plan, 40+ agents | Large teams and brokerages | Custom | Let's talk | Custom |
| Amplified Insiders | Owners and ops leads who want to go at their own pace | Every owner and ops skill, 2 new skills a month, office hours | $197 a month with a 3 month minimum, or $1,997 a year (2 months free). The annual price counts in full toward the Amplified AI Accelerator. | Keep what you've downloaded if you cancel. Lose new skills, updates and office hours. |
| Single skill | Anyone | One locked skill | $37 each | One time |

Why these numbers:

- $79 matches the market (The Paperless Agent charges $77 a month for templates alone) and we add live coaching.
- At 7 agents the team plan already beats buying solo seats, so the team math sells itself.
- One weekly agent coaching call serves every tier, so delivery cost barely grows as we add teams.
- Forum buyers of Amplified Team Plan lock today's price. They pay their first 3 months at the Forum: $1,491 up to 15 agents, $2,391 for 16 to 40. That covers January 4 to April 3, and monthly billing starts April 4. December bonuses: their agents get the starter path and the 5 free skills on December 14, plus the December 17 goal planning Zoom.

## How each program runs

Amplified AI Accelerator runs in cohorts. Everything else is open to join any day.

Amplified AI Accelerator: $7,500 founding price, 10 seats, first live build is Wednesday, December 2. Builds run Wednesdays and office hours run Thursdays. The founding price ends Monday, November 30. We announce it at the Forum first, but the page doesn't say it's Forum only. Anyone can buy a founding seat while they last. Owners build together, so a cohort works here. Run it every 8 to 12 weeks.

Amplified Agent Plan and Amplified Team Plan: weekly training starts the week of January 4, then rolling enrollment, no cohorts. Teams hire every month, and an agent who has to wait for the next cohort never starts. Instead, the live training runs on a monthly rotation, so anyone who joins hits every topic within 4 weeks.

1. Day one: a short recorded starter path. AI Brain Setup, Voice Profile, and their first 3 agent skills. Done in their first week.
2. Weekly live training: one 60 minute session, building one skill live on a real file. The topic rotates each week of the month:
   - Week 1, Leads and follow-up: Speed to Lead Reply, Sphere Touch Plan, Open House Follow-Up
   - Week 2, Listings: Pricing Conversation Prep, Listing Description Writer, Seller Listing Update
   - Week 3, Buyers and contracts: Offer Strategy, Due Diligence Review, Counter Explainer
   - Week 4, Content and your week: Content Strategist, Perfect Week, Appointment Follow-Up
3. Weekly office hours: drop in with a real file and get help.
4. Every session is recorded into the library, so nobody is ever behind.
5. For teams, the owner gets a usage view and, on the 16 to 40 tier, a monthly owner call.

## Office hours

Every program includes one shared weekly office hours: 60 minutes on Thursdays. That goes on every offer card as one line: Every program includes weekly office hours.

We don't build for scale yet. Live attendance usually runs 10 to 20% of members, so 200 members is about 20 to 40 people on the call. These triggers are set now so nobody improvises later.

| Live attendance | How we run it |
| --- | --- |
| Up to 25 | One room, Connor leads. People submit questions on a short form before the call so similar ones get answered once. Every session is recorded into the library. |
| 25 to 60 | Add a tech assistant. Connor opens in the main room with the top questions, then splits into two breakout rooms: Agents, and Owners and Ops. The assistant runs one. |
| 60+ most weeks | Split into two sessions with their own time slots: Agent office hours and Owner office hours. Turn recorded answers into a searchable FAQ in the library so fewer people need to come live. |

Track live attendance every week on the L10 scorecard so we see the trigger coming.

## Offer rules from the AI Offers And Funnel Plan

The AI Offers And Funnel Plan (https://claude.ai/artifact/PhP85u9yusRXeJpx7eSCRd) is the source of truth for the offer. These rules go on every cart and sales page.

Keep it simple. Every offer has one price and, at most, one membership after it. Amplified Insiders is that membership and is also the standalone way to get every owner and ops skill: $197 a month with a 3 month minimum, or $1,997 a year (2 months free). New skills every month plus weekly office hours. It is one offer (yearly or monthly), not a library purchase plus a separate membership. The product name Amplified Skill Library is retired. Amplified AI Accelerator graduates join Amplified Insiders after their 90 days. No add-ons.

Push annual Amplified Insiders. The Forum pitch is: build it live with us for $7,500, or get every skill and a year of office hours for $1,997. On the page, show yearly first with "2 months free" and "counts toward the Amplified AI Accelerator." Monthly sits underneath as the smaller option.

- Cohort seats are 10. If more than 10 want in, we add a tech assistant, not more seats.
- Group delivery only. No custom builds.
- Cancel and keep: anyone who cancels keeps the skills they've downloaded and loses new skills, updated versions and office hours. Monthly plans have a 3 month minimum.
- Two new skills a month, every month.
- Credits: the $1,997 annual Amplified Insiders price counts in full toward the Amplified AI Accelerator. Monthly payments don't. VIP bootcamp buyers get their $197 back as a credit toward the cohort.
- Refunds: no refunds. A cohort seat can move to the next cohort. Attorney confirms the wording.
- AI Bootcamp, February 23 to 25: $47 general, $197 VIP. It fills cohort two.
- Cohort two sells February 25 to March 19, with Spring Break (March 14 to 16) as the live close, and builds start March 24. Then a cohort every 12 weeks.
- The plan tags 30 skills into an owner set and an agent set. The site shows 56. Connor reconciles the count and the tags.

## Funnel and launch calendar

Cohort one sells straight from the Forum room in November. Every cohort after that is filled by the public funnel.

1. Free: 5 free skills and the lead magnets bring people in, tagged agent or team owner.
2. AI Bootcamp, February 23 to 25: $47 general, $197 VIP. Three live days building one skill. It qualifies owners for the cohort.
3. Amplified AI Accelerator: the core offer. Cohort two sells from the last day of the Bootcamp, February 25, through March 19, with Spring Break as the live close. Buyers get Amplified Insiders and Thursday office hours the day they buy, so nobody waits. Builds start Wednesday, March 24.
4. Not ready for the cohort: Amplified Insiders at $1,997 a year, which counts toward the cohort, or $197 a month.
5. Agents: Amplified Agent Plan for solo agents, and Amplified Team Plan as the recurring tail once owners have built their systems.

| Date | What happens |
| --- | --- |
| Fri, Nov 13 | Forum: Spring's AI talk tees up the offers. No pitch. |
| Sat, Nov 14 | Forum: live build, then the invitation. Carts open. |
| Mon, Nov 16 | Welcome emails, intake forms, free skills to the whole room |
| Mon, Nov 30 | Founding prices close at 11:59 PM Mountain |
| Wed, Dec 2, 9, 16 | Amplified AI Accelerator, builds 1 to 3 |
| Thu, Dec 10 | Year-end AI goal planning Zoom for every buyer |
| Mon, Dec 14 | Agent starter path live. Forum team buyers' agents get it, plus the 5 free skills, as a December bonus. |
| Thu, Dec 17 | Second goal planning Zoom with owners' agents invited, a December bonus for team buyers |
| Dec 23 and Dec 30 | Holiday break, no builds |
| Mon, Jan 4 | Weekly agent training starts. Amplified Agent Plan opens. Forum teams' prepaid 3 months begin. |
| Wed, Jan 6, 13, 20, 27 | Builds 4 to 7 |
| Mon, Jan 25 | Bootcamp cart live |
| Wed, Feb 3 | Build 8. Record results and testimonials. Bootcamp promo starts. |
| Feb 23 to 25 | AI Bootcamp. Cohort two cart opens on the last day. |
| Mar 14 to 16 | Spring Break. Cohort one teams on stage. Live close for cohort two. |
| Fri, Mar 19 | Cohort two cart closes |
| Wed, Mar 24 to May 12 | Cohort two builds |
| Week of Jun 15 | Cohort three opens, then every 12 weeks |

See the AI Offers And Funnel Plan (https://claude.ai/artifact/PhP85u9yusRXeJpx7eSCRd) for the revenue picture and the full cart task list with owners.

## Make the choice easy

Someone should land on the site and know their option in 10 seconds.

- Add a "Which one is right for me?" picker at the top of the pricing page with three buttons: I'm an agent, I own a team, I just want the skills. Each one scrolls to its card.
- Every card answers the same five things in the same order: who it's for, what you get, how it runs (live or self-paced), when it starts (Starts Wednesday, December 2, or Start today), and the price.
- One button per card. No second links competing with it.
- Under the cards, add a simple comparison table: rows for skills, live training, office hours, owner view and start date, with a check or dash for each program.
- Add a short FAQ: Do I need Claude or ChatGPT? Which plan? What if I join mid-month? Can I cancel? Do I need Follow Up Boss?
- Keep a "Not ready? Start with 5 free skills" line under every card, so nobody leaves with nothing.

## Carts and checkout

Every offer gets its own Stripe checkout, so people can buy the moment they decide. Logins arrive by email after payment, the way they do now.

Stripe products to set up:

- Amplified AI Accelerator: $7,500 in full or 2 pays of $3,750 (founding), then $9,997, capped at 10 founding seats. When it sells out, the button switches to the waitlist.
- Amplified Agent Plan: $79 monthly and $790 yearly.
- Amplified Team Plan, up to 15: $497 monthly with a 3 month minimum.
- Amplified Team Plan, 16 to 40: $797 monthly with a 3 month minimum.
- Amplified Team Plan, 40+: no cart. The button books a call.
- Amplified Insiders: $197 monthly with a 3 month minimum, and $1,997 yearly. Show the yearly option first.
- Single skills: one $37 product per locked skill, or one product with the skill picked at checkout. Whichever is easier to keep in sync as we add skills.
- Amplified Team Plan, Forum buyers: first 3 months paid at checkout ($1,491 or $2,391), then monthly billing starts April 4. AI Bootcamp: $47 general and $197 VIP, live by January 25.

Checkout rules:

- Buying one skill unlocks that skill in the buyer's account. On the thank you page, offer Amplified Insiders with a credit for what they just paid.
- Team checkout asks for the team size and the owner's email, then sends the owner a link to invite agents.
- Every cart tags the contact in GoHighLevel as agent or team owner, plus the product bought.
- Keep the terms, privacy and unsubscribe language from the current waitlist form.
- The current "Opens soon" state stays only until each cart is live.

## The Library and gating

Show all 56 so people see the depth. Make 5 free and lock everything else. Today about 13 items are free and the page is titled "The Free Library," which undercuts the paid offers. Rename it The Library.

| Free skill | What it does | Works in |
| --- | --- | --- |
| AI Brain Setup | Sets up your AI to know you, your work and how you like things done | Claude, ChatGPT |
| Sounds Like You: AI Voice Profile | Teaches your AI to write the way you actually talk | Claude, ChatGPT |
| AI Brain Tune-Up | Finds stale, conflicting or vague instructions and memory, and hands back clean ones | Claude, ChatGPT |
| Perfect Week | Turns your calendar and to-do list into a week that fits your working hours | Claude |
| Inbox and Meeting Follow-Through | Pulls the decisions, drafted replies and forgotten promises out of your inbox and meetings | Claude |

All five are for anyone, agent, team owner or not in real estate at all. They make AI useful in your daily life first, which builds trust and fits the long-term plan to grow past real estate. The real estate skills are what people pay for. Perfect Week and Inbox Follow-Through need a paid Claude plan, which is fine. They show why it's worth it.

Lock everything else, including what's free today: Appointment Follow-Up, Database Health Check, Team P&L Review, and the Grok Bot templates without a lock (Weekly Card and Bank Audit, Quarterly Tax Set-Aside, Contract-to-Close Deadline Tracker, New Contract Intake).

How a locked skill card works:

- Name, one line of what it does, and the tool tags (Claude, ChatGPT) stay visible.
- A lock icon replaces the arrow.
- Clicking opens a preview with the full description and two buttons: Buy this skill for $37, or Get Amplified Insiders.
- Free skills ask for name and email once. After that, every free skill is open.

Filters: add a Track filter (Real Estate, General) and a Who filter (Agents, Team Owners) next to the current tool and topic filters. Decide whether Grok Bot stays in this library or moves to its own page. Three AI tools on one page can confuse an agent who's just starting.

## Free resources and lead magnets

These are guides and kits, separate from the 5 free skills. Each one is tagged either agent or team owner, so the list stays segmented from day one.

| Resource | Audience | Tag in GHL |
| --- | --- | --- |
| Sounds Like You: Your AI Voice Profile | Everyone (also one of the 5 free skills) | agent |
| AI 101 for Agents workshop kit and replay | Agents | agent |
| The Ops Time Audit | Team owners | team |
| Task Sync Starter Kit | Team owners | team |
| Retool, Don't Replace workshop kit | Team owners | team |

Each resource gets a simple opt-in page: name, email, and the agent or team owner question. The thank you page delivers the resource and shows the matching offer: Amplified Agent Plan for agents, Amplified Team Plan for owners. ManyChat keywords should point straight to these pages.

## Skill pages and cards: lead with what it does

Every skill card and skill page should tell people what the skill does for them before it tells them how to use it. Right now the cards open with instructions ("Attach one transaction file's document list...") and end with "Set it up once on a computer." The TC File Audit page opens straight into a long made-up audit with no line saying what the skill is or why you'd want it. A visitor has to read the output to work out the point.

Card formula: one line on the outcome, one line on who it's for. Inputs and setup move to the skill page.

| Skill | Card today starts with | Card rewrite |
| --- | --- | --- |
| TC File Audit | Attach one transaction file's document list, the contract's key dates... | Catches missing documents, unsigned addendums and blown deadlines before your broker does. For TCs and agents. |
| Offer Strategy | Upload the listing's MLS sheet, your comps and your buyer's preapproval letter... | Builds a winning offer term by term, with the risk of each term in dollars. For buyer's agents. |
| Speed to Lead Reply | Paste in a new online lead... | Writes a personal first reply to a new lead in two minutes, so you're first to respond. For agents. |
| Database Health Check | Upload your CRM export... | Finds the money hiding in your database and tells you who to call this month. For agents and team owners. |
| Perfect Week | Claude turns your calendar and task list into a week... | Plans a week that actually fits your hours. For anyone. |

Skill page layout, top to bottom:

1. Name and a one-line promise (the card rewrite).
2. What it does for you: three short outcomes, plain words.
3. Who it's for and when to use it.
4. Time it saves, if we know it.
5. Unlock button: Free, Buy this skill for $37, or Get Amplified Insiders.
6. Example output, shortened, with the made-up label. This is proof, not the opening.
7. What you'll need and how to set it up. Last, because it only matters once they want it.

TC File Audit page, opening copy to use:

> TC File Audit
> Catches what's missing before your broker does.
> It checks one transaction file against your brokerage checklist and the contract dates. You get the missing documents, anything not signed by every party, every deadline with the days left, and a drafted note to the agent. It only reads, so nothing changes until you act.

Apply this to all 56 skills and the Grok Bot templates.

## Grok Bot: lead with a Morning Brief

Grok Bot skills run on a schedule, so the best ones show up every day without anyone asking. The first one to build is a Morning Brief that anyone can use, and it should be the free Grok Bot template.

Morning Brief, free, for anyone: every morning at 6am it shows the day's meetings with a line of prep for each, the emails that need you, your top 3 to-dos, anything due or overdue, birthdays and the weather. It reads and drafts. It never sends.

Paid versions add the real estate layer:

- Agent Morning Brief: new leads to call, today's showings, contract deadlines and past client anniversaries.
- Team Owner Morning Brief: yesterday's numbers, deals at risk and which agents went quiet.

Next everyday templates to add after the Morning Brief:

1. Sunday Weekly Reset: looks back at last week, plans next week, and lists promises not yet kept.
2. Follow-Up Nudge: flags anyone you said you'd get back to and drafts the message.
3. Money Watch: bills due, subscriptions that renewed and anything odd on your cards.

## Build spec and launch checklist

This is the full spec for the build. Hand it to Grok Bot and Claude section by section. Everything above is the strategy. This section is what to build, in what order, with owners. Connor owns proof, the GoHighLevel follow-up and tracking.

### 1. Facts to use everywhere

Every page, email and checkout has to show the same facts.

| Item | Fact |
| --- | --- |
| Amplified AI Accelerator price | $7,500 founding price, 10 seats. $9,997 after the founding price ends |
| Founding price ends | Monday, November 30, 2026, 11:59 PM Mountain |
| First live build | Wednesday, December 2, 2026 |
| Live builds | 8 weekly 90 minute builds, Wednesdays |
| Office hours | Weekly 60 minutes, Thursdays |
| After the program | 90 days of new skills and office hours after the last build on Wednesday, February 3, 2027, then Amplified Insiders at $197 a month until they cancel. First $197 charge for cohort one: Tuesday, May 4, 2027 |
| Amplified Insiders | $197 a month with a 3 month minimum, or $1,997 a year (2 months free). Show yearly first. The annual price counts in full toward the Amplified AI Accelerator. Monthly payments do not. |
| Amplified Team Plan, Forum checkout | First 3 months paid today: $1,491 (up to 15) or $2,391 (16 to 40), covering January 4, 2027 through April 3, 2027. Monthly billing starts April 4, 2027 |
| Requirement | Amplified AI Accelerator requires Follow Up Boss. Everyone else joins the waitlist. |
| Amplified Agent Plan | $79 a month or $790 a year, opens the week of January 4, then join any day, cancel anytime |
| Amplified Team Plan | $497 a month up to 15 agents, $797 a month for 16 to 40, custom over 40, 3 month minimum |
| Single skill | $37 |
| Free skills | AI Brain Setup, Sounds Like You, AI Brain Tune-Up, Perfect Week, Inbox and Meeting Follow-Through |

Holiday break: no builds or office hours on December 23 or December 30. The 8 builds run December 2, 9 and 16, then January 6, 13, 20 and 27, and February 3.

### 2. Design and copy rules

- This is a structure and copy pass. Keep the current colors, fonts and visual style.
- Copy follows Spring's voice: contractions, no em dashes, short sentences, 4th grade reading level, lead with a statement, no victim language.
- Lock the program names: Amplified AI Accelerator, Amplified Agent Plan, Amplified Team Plan, Amplified Insiders, Morning Brief. The catalog page at /library is called the Library (a place), not an offer name.
- Every price shows on the page. Never "price shows on the payment page."
- One primary button per section. Secondary links are plain text.
- Build one offer card component and reuse it everywhere: who it's for, what you get, how it runs, when it starts, price, button, and the "Not ready? Start with 5 free skills" line.
- Mobile first. Most traffic comes from Instagram. Buttons are thumb sized, text is at least 16px, nothing scrolls sideways.
- Every made-up example is labeled "Made-up example."
- Real photos only. No stock photos of people.
- Alt text on every image. Good color contrast.
- Each page gets an SEO title, meta description and a share image.

### 3. Page by page

Home: build the nine sections in the Homepage outline above.

Pricing (/pricing):

1. Headline: Pick the way you want to learn AI.
2. Picker with three buttons: I'm an agent, I own a team, I just want the skills. Each scrolls to its card.
3. Founding price banner with a live countdown to November 30, and seats left for the Amplified AI Accelerator.
4. Four offer cards: Amplified AI Accelerator, Amplified Agent Plan, Amplified Team Plan, Amplified Insiders.
5. Comparison table. Rows: skills included, live training, office hours, owner view, owner call, starts, price, commitment.
6. FAQ: Do I need Claude or ChatGPT? Which plan do I need? What if I join mid-month? Can I cancel? Do I need Follow Up Boss? What's the refund policy? Can I buy one skill?
7. Final line: Not ready? Start with 5 free skills.

Amplified AI Accelerator (/team-build):

1. Hero: name, the line "8 weeks. 8 skills. Built live with us.", first build date, seats left, countdown, buy button.
2. Who it's for: team owners and ops leads on Follow Up Boss. Who it's not for, with a waitlist link.
3. The 8 skills, one per week. Draft list for Spring and Connor to confirm: Team AI Brain, FUB Automation Audit, FUB Pipeline Review, Agent 1:1 Prep, L10 Meeting Prep, Team Playbook Builder, Recruiting Prep, Lead-Source ROI.
4. How it runs: Wednesday builds, Thursday office hours, recordings in the library.
5. What you get: both skill sets, all 8 builds, office hours, 90 days of new skills, then Amplified Insiders at $197 a month.
6. Proof: Utah Life story and testimonials.
7. Meet Spring and Connor.
8. Price block with countdown and buy button.
9. FAQ.

Amplified Agent Plan (/agents):

1. Hero: name, one line promise, $79 a month, Join button. Opens the week of January 4.
2. Your first week: the starter path.
3. The monthly training rotation as a simple 4 week calendar.
4. Office hours.
5. What happens after you buy.
6. Proof, FAQ, final button.

Amplified Team Plan (/teams):

1. Hero: Let us train your team. Three tier cards.
2. What your agents get, same as Amplified Agent Plan.
3. What you get as the owner: usage view, monthly owner call on the 16 to 40 tier.
4. How agents join: you invite them by email, they start the starter path the day they join.
5. 3 month minimum, then month to month.
6. Proof, FAQ, buttons. Over 40 books a call.

The Library (/library): rename from The Free Library. Build the gating, filters and cards in The Library and gating section above.

Skill page template: use the layout in the Skill pages section above for all 56 skills and the Grok Bot templates.

Free Resources (/free): two columns, For Agents and For Team Owners. Each resource opens its own opt-in.

About (/about): Spring as the face, Connor as co-founder, the Utah Life story, why we built this.

Thank you pages, one per product: what happens next, login email note, add to calendar buttons for Wednesday builds and Thursday office hours, the starter path link, and a support email.

### 4. Proof (Connor owns)

The page needs real proof before launch. Until we have it, lead with Utah Life numbers. Never use made-up testimonials.

- Collect 3 to 5 testimonials from AI 101 attendees and Utah Life agents. Short videos of 30 to 60 seconds are best, written quotes are fine.
- Ask three questions: Which skill did you use? What changed? What's the number (hours saved, a deal saved, a lead won)?
- Get written permission to use each name, photo and quote.
- Grab screenshots of real skill outputs with client details removed.
- Place proof on the home page, the pricing page and every sales page, next to the buy button.
- Add AI 101 attendance numbers to the proof strip once they're final.

### 5. GoHighLevel follow-up (Connor owns)

Every opt-in and purchase starts a sequence. Emails from Spring open with "Hi friend," and a real story. Every email has one link and one ask. Branch every sequence by agent or team owner.

1. Free skill opt-in, 6 emails over 10 days: Day 0 deliver the skills and how to set up the first one. Day 1 a quick win to try today. Day 3 a story from Spring about AI in her business. Day 5 point to a second free skill. Day 7 invite to the matching program (Amplified Agent Plan for agents, Amplified Team Plan or Amplified AI Accelerator for owners). Day 10 last nudge.
2. Free resource lead magnets: the same shape, tailored to each resource.
3. Amplified AI Accelerator launch, Forum through November 30: cart open, what you'll build, proof, FAQ, seats left, 48 hours left, last day.
4. Purchase onboarding for every product: welcome and login, calendar invites, starter path, day 3 check-in, reminder before the first live session.
5. Abandoned checkout: 1 hour and 24 hours after someone starts checkout and doesn't finish.
6. Single skill buyers: day 2 and day 7, offer Amplified Insiders with a credit for what they paid.
7. Waitlist: confirm, then announce the next cohort first.
8. Cancellations: one email asking why, with a pause option if we offer one.

Send from a warmed sending domain with SPF, DKIM and DMARC set up.

### 6. Tracking (Connor owns)

The goal is to know which page, which free skill and which source turns into a buyer, so we put money and content behind what works.

- Tags on every contact: role (agent or team owner), source (Instagram, ManyChat, Forum, AI 101, ads, referral), the lead magnet or free skill they grabbed, the product they bought, and their cohort.
- One GoHighLevel pipeline: New lead, Free skill used, Sales page viewed, Checkout started, Purchased, Active, Cancelled.
- Stripe sends every purchase, renewal and cancellation to GoHighLevel so tags and the pipeline update on their own.
- Meta pixel and Google Analytics on every page. Track page view, lead, sales page view, checkout started and purchase with its dollar value.
- UTM links on everything: Instagram bio, ManyChat, every email, Forum slides and QR codes.
- A weekly scorecard for the L10: opt-ins by lead magnet, sales page conversion, purchases by product, monthly recurring revenue, cancellations.

### 7. Launch QA

- Every button and link works
- A test purchase on every Stripe product in test mode, then one live
- Logins arrive by email after purchase
- Every form sends to GoHighLevel with the right tags
- Every sequence sends, with no broken links or merge fields
- The countdown ends November 30 and the page switches to the next price or the waitlist
- The seats left counter matches real sales
- "Opens soon" is gone everywhere
- Locked skills show the lock and the buy buttons. Free skills open after one opt-in.
- Refund policy, terms and privacy links on every checkout
- Every page checked on an iPhone and an Android
- Pages load fast on mobile
- SEO titles, meta descriptions, share images and favicon set
- Alt text on every image
- Spelling and the facts table checked on every page
- Spring signs off on all new copy before it goes live

## Open decisions and next steps

Decisions:

- [OPEN: day and time for the weekly agent training, starting the week of January 4]. Use a placeholder such as "weekly, starting the week of January 4" until Connor sets the day and time. Do not invent one.
- [OPEN: payment plan for the $9,997 price]. Founding is 2 pays of $3,750. Do not invent installments for the regular price.
- Decided: skip December 23 and December 30. Last build is February 3.
- [OPEN: confirm the 8 skills for the Amplified AI Accelerator]. Draft list, treat as a placeholder until confirmed: Team AI Brain, FUB Automation Audit, FUB Pipeline Review, Agent 1:1 Prep, L10 Meeting Prep, Team Playbook Builder, Recruiting Prep, Lead-Source ROI.
- Decided: Amplified Insiders is $197 a month with a 3 month minimum, or $1,997 a year with full credit toward the Amplified AI Accelerator.
- [OPEN: founding rates for team plans, yes or no]. Do not say the $497 / $797 Team Plan prices end on November 30 unless Connor decides they do.
- [OPEN: Grok Bot templates stay in the Library or move to their own page]. Keep them in the Library until Connor decides.
- [OPEN: one Stripe product per skill, or one product with the skill picked at checkout]. Ampy will create any Stripe objects; do not invent a schema.
- [OPEN: show 30 skills or 56]. The earlier plan tags 30; the site shows 56. Do not delete skills until Connor reconciles the count and the tags.

Build order:

Phase 1, by Thursday, November 12, before the Forum:

1. Stripe carts: Amplified AI Accelerator ($7,500 or 2 pays of $3,750), Amplified Insiders ($1,997 a year, or $197 a month with a 3 month minimum), and Amplified Team Plan (first 3 months paid today, $1,491 or $2,391, then monthly from April 4)
2. One simple offer page behind the Forum QR code with those three offers and prices
3. Welcome email and intake form for each offer
4. Refund wording from the attorney and the Forum revenue split decided

Phase 2, by Monday, November 30, when founding prices close:

5. Homepage hero, proof strip and Meet Spring and Connor (Spring reviews the copy first)
6. Pricing page with the picker and all offers
7. Library gating: 5 free, locks, buy buttons. Settle 30 skills versus 56 first.
8. Amplified AI Accelerator sales page with the countdown and seats left
9. Office hours form, recording setup and attendance tracking before December 3

Phase 3, by early January:

10. Amplified Agent Plan and Amplified Team Plan pages and carts, live before January 4. The agent starter path is due December 14 for the December bonus.
11. Free Resources page, opt-ins with agent and team tags, and the GoHighLevel sequences
12. Rewrite every skill card and skill page to lead with what it does
13. Free Morning Brief Grok Bot template, then the agent and team owner versions
14. AI Bootcamp page and cart by January 25


## Agreement conflicts

Do not edit `/agreement`. Quote any conflict in your PR report. These lines on the live page (https://www.amplifiedimpact.io/agreement, Effective November 12, 2026, Version 2026-11-12) no longer match this plan:

1. **Section 1, Amplified Skill Library.** "Amplified Skill Library. The owner and operations skills, plus the new skills released while your membership is paid. Office hours for 30 days, then while your membership is paid." The Skill Library product name is retired. The purchasable offer is Amplified Insiders at $1,997 a year or $197 a month with a 3 month minimum, not a separate library price plus 30 days of office hours and then a membership.
2. **Section 1, Amplified AI Accelerator.** "eight weekly live builds for cohort one starting Tuesday, December 1, 2026." Builds now start Wednesday, December 2, 2026, run on Wednesdays, and end Wednesday, February 3, 2027 (not a Tuesday, December 1 start or a February 2 end).
3. **Section 1, missing offers.** The agreement does not list Amplified Insiders as a standalone purchasable plan (yearly or monthly). It only describes Insiders as the auto-roll after the Accelerator. It also does not mention the Amplified Agent Plan ($79 a month or $790 a year) or single skills at $37. Those last two are Phase 3, but the Insiders standalone offer is Phase 1.
4. **Section 2.** "Logins for plans bought by November 15, 2026 are sent on Monday, November 16, 2026." Founding prices now close Monday, November 30, 2026 at 11:59 PM Mountain. The November 16 login drop may still be right for Forum-week buyers; the November 15 cutoff no longer matches the founding window.
5. **Section 3, Amplified Skill Library.** "The library price today, then the monthly membership starting on day 31, each month until you cancel." That is the retired $2,000 + day-31 $197 structure. It should eventually describe Amplified Insiders yearly ($1,997, 2 months free, counts in full toward the Accelerator) or monthly ($197, 3 month minimum; monthly payments do not count toward the Accelerator).
6. **Section 3, Amplified Insiders.** "starting Monday, May 3, 2027 for cohort one." Last build is Wednesday, February 3, 2027; 90 days later is Tuesday, May 4, 2027, not May 3.
7. **Section 3, Amplified Team Plan.** "Nothing today. The monthly price starting Tuesday, January 26, 2027." Forum buyers now pay the first 3 months at checkout ($1,491 up to 15 agents, $2,391 for 16 to 40), covering January 4, 2027 through April 3, 2027, and monthly billing starts April 4, 2027.
8. **Section 4.** "The Amplified Team Plan has a minimum term of three monthly payments, starting January 26, 2027. To cancel before the third payment, write to admin@amplifiedimpact.io." If the first 3 months are prepaid at checkout, the minimum is collected up front and this "write to admin before the third payment" mechanic needs an attorney rewrite.
9. **Section 5.** "You can cancel a monthly membership yourself, at any time, in the billing portal linked from your Skill Library page, with 30 days' notice." Conflicts with (a) the retired "Skill Library page" name, (b) "at any time" versus the 3 month minimum on Insiders monthly and on the Team Plan, and (c) the live portal, which already lets any subscription cancel at period end.
10. **Credits are missing.** The plan says the $1,997 annual Insiders price counts in full toward the Amplified AI Accelerator, monthly payments do not, and VIP bootcamp buyers get their $197 back as a credit toward the cohort. None of that is in the current agreement.

Also flag, without editing: Spring's "Monthly plans have a 3 month minimum" may or may not apply to Accelerator graduates when their Insiders billing starts on May 4. The current agreement lets them cancel Insiders in the portal with 30 days' notice and does not add a new 3 month minimum after the roll-on. Leave that to the attorney.
