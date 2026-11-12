# Homepage v3: fact and rule check (Nov 12, 2026, 11:30 AM CT)

Checked against live www.amplifiedimpact.io (/, /pricing, /library, /about, /teams, /team-build, /agents, /insiders, /free) and the site rules.

## Matches (no action)
| Item | Mockup | Live | Result |
|---|---|---|---|
| Programs menu prices | Accelerator "$7,500 founding price" · Agent "$79 a month" · Team "From $1,491 for 3 months" · Insiders "$1,997 a year or $197 a month" | /pricing: $7,500 founding / $9,997 next; $79 a month or $790 a year; $1,491 today for 3 months up to 15 (or $2,391 for 16 to 40, then $497/$797 from Apr 4, 2027); $1,997 a year or $197 a month | Match. (Menu is dropped anyway: kit header rule) |
| Program card prices and terms | 2 × $3,750; "Then $9,997. Ends Nov 30."; "First charge Jan 4."; "from April 4, 2027"; Insiders "3-month minimum"; "May 4, 2027" | same on /pricing | Match |
| Payment Links | 8 links: …G01, G02, G06, G07, G08, G09, G0a, G0b | the same 8 on /pricing, the same plan mapping | Match |
| Hero stats | JS counts to **100**, **700+**, **58** (Library length). "19 / 131+ / 11" in text.txt was a mid-animation frame | proof line "100 agents, 700+ homes a year"; /library "Showing 58 resources" | Match. Must render final values in HTML |
| "11 skills, guides and templates" | Same counter mid-frame, ends at 58 | 58 | Match |
| Org chart skill names | 29 unique; 26 linked as "Skill in the Library" | all 26 found by exact title in /library; Daily Sisu reports, Morning Debrief, Team activity reports are not, and are labeled "Built for our team" | "26 of 29 are in the Library" is correct |
| Library favorites (16) and free five | all names | all in /library | Match |
| Accelerator schedule | Weeks 0–8, Dec 2 … Feb 3, break Dec 23/30, Wed 1:00 PM CT | /team-build same | Match |
| Days left | "18 days left" (computed) | /pricing "18 days left" | Match. Keep it computed |
| "Made-up example" labels | hero badge; "Made-up example · Morning Brief" in How | live homepage uses the same convention ("Offer plan · Made-up example") | OK. Keep both visible |

## Conflicts
| # | Item | Mockup text | Live / rule | Needs |
|---|---|---|---|---|
| C1 | Proof line missing | No "100 agents, 700+ homes a year" anywhere. 6 buy CTAs (S11 ×5 incl. "Or 2 payments", S12 "Claim a Founding Seat") | Rule: proof line next to every buy button; /pricing and live / have it under each card | Fix by rule (brief §6.4) |
| C2 | Buy and seat elements start hidden | S11 "Claim a Founding Seat", "Or 2 payments of $3,750", "Join Insiders", "Train My Team", "Start the Agent Plan" and the S11 seat meter: opacity 0 at load (`.rv-wait`). Also band "Try 5 Skills Free", hours "Start Getting Them Back, Free", "Get the 5 Free Skills" and close "Get 5 Free Skills" | Rule: no buy, seat or proof element starts hidden | Fix by rule (NEVER_HIDDEN) |
| C3 | Header | Programs menu with prices, order Accelerator → Agent → Team → Insiders, theme button | Kit header (#94): Accelerator → Team → Agent → Insiders, no prices, theme switch hidden on / | Fix by rule: kit header unchanged. Optional idea for Ampy: prices in menu |
| C4 | Direct Stripe links on the homepage | S11/S12 carry 6 direct buy.stripe.com CTAs (8 hrefs with toggles) | Live / has **no** buy.stripe.com links today; cards go to program pages | **Connor decision** (+ Ampy owns checkout) |
| C5 | Spring quote | "It started with our Sisu data. I connected it to Claude, built skills, and now my reports show up every morning. Then we moved into finance. AI runs 95% of it now, and our bookkeepers add the human part. Now it's in sales, recruiting and marketing. Our production is up 38% over last year, and AI is a big reason why." — Spring Bengtzen | Not on any live page; "Sisu" appears live only as a CRM name on /ops-time-audit. No source in the box files | **Connor + Spring decision** |
| C6 | 38% / 95% counters | "38% More production than last year, and AI is a big part of why"; "95% Of our finance work done by AI. Our bookkeepers add the human 5%." (JS end values 38 and 95; HTML starts at "0%") | Nowhere on the live site. Rule: no fake stats | **Decision**: sourced or cut |
| C7 | "12 people" | "12 people · 29 skills working for them" (= count of chart boxes: CEO, Integrator, 3 seats, 7 roles) + "Every seat is a person." | Team is 100 agents (proof line); "Agents" and "Bookkeepers" are one box each | **Decision**: relabel or drop |
| C8 | "Real EOS chart" | "This is the real EOS chart at The Utah Life Real Estate Group." | Not stated live; EOS only appears as "weekly EOS L10" on /insiders | Spring to confirm |
| C9 | Video | "Watch it run in a real business." "90 seconds · Spring's actual morning" "Placeholder · Screen recording goes here" "No stock footage. No demo account. This is Spring opening the reports…" (`src: null`) | No recording exists | **Decision** |
| C10 | Founder photos | Initials "CL" / "SB" tiles | Live uses real photos /img/team/connor-leiva.jpg, spring-bengtzen.jpg | Fix by rule: use real photos |
| C11 | Spring's title | "Co-founder, Amplified Impact · CEO, The Utah Life Real Estate Group" / chip "Founder of The Forum" | /about: "Founder and CEO, The Utah Life Real Estate Group"; Connor is the one labeled "Co-founder, Amplified Impact". "The Forum" not on site | **Decision** |
| C12 | Connor's bio | "With an MBA in data analytics, he knows the numbers behind a team better than almost anyone" / chip "MBA, data analytics" | /about: "He holds an MBA from the University of Denver and a master's in Organization Development and Change from Penn State" | **Connor confirm** wording |
| C13 | Spring bio stat | "Her production is up 38% year over year, and she credits a big part of that to AI." | Not live (same as C6) | follows C6 |
| C14 | Team Plan unlock | "Skills open December 14, and live classes start the week of January 4." | /teams: "Their skills and the starter path open Monday, December 14." /pricing: "your agents get the starter path and the 5 free skills on December 14" | Mockup matches /teams; /pricing disagrees (existing). **Connor confirm** which is right; no date change from us |
| C15 | Unlabeled illustrative numbers | S3 "12 Times you've explained your business this month"; S12 "5 of 8 built" ring (scroll-driven, can rest mid-way) | Rule: no fake stats | **Decided by Connor:** tag S3 "Made-up example". S12 ring never rests on a partial number (brief §5) |
| C16 | Theme | Light/dark toggle in header; alternating light, dark and forest sections | / is dark-only since #94 (switch hidden) | **Decision** |
