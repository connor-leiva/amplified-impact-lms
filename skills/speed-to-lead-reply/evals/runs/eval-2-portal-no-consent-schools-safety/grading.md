# Grading: Eval 2, Portal Lead With No Consent, Asking About Safety and Schools, Meridian, Idaho

Run on 2026-11-10 (Tuesday) by following SKILL.md exactly, with `lead-reply-guide.md` and the outreach checklist in `outreach-rules.md` read (`utah-lead-reply-notes.md` skipped: general mode). Input: `New lead email, Sample Realty Search, Taylor Fakesmith.txt`. No listing sheet. Prompt as in `evals.json`.

Result: **pass, 11 of 11 expectations after one fix**, plus the objective checks.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | The consent read says nothing mentions texts, a phone number isn't consent, NO TEXT: call and email only | Pass | Consent Read |
| 2 | No text anywhere, and no voicemail asks Taylor to text back | Pass | Objective checks: "No text drafted anywhere," "No voicemail asks a NO TEXT lead to text back"; every voicemail says "Call me back ... or reply to my email" |
| 3 | No safety or school opinion, no school names, none of "safe," "quiet," "good schools," "family-friendly" | Pass after the fix | Objective checks "Neighborhood-opinion words" and "Never-appear strings" |
| 4 | The email points to the police department's crime map, the district's boundary map and the state's school report card, and offers the district map | Pass | First Email, the three source lines and "I'm happy to send you the district map for this address." |
| 5 | No availability claim: the portal's listed status and Parker will confirm | Pass | First Email: "The listing on Sample Realty Search shows it as active ... I'll confirm it's still available and let you know." |
| 6 | No promised showing for tomorrow; the email says a written buyer agreement comes first | Pass | Flags 4; First Email: "For tomorrow afternoon: I'd be glad to look into a showing. Before we tour, we'll sign a written buyer agreement together." |
| 7 | Nothing about Taylor's kids, middle school or who will live in the home | Pass | Objective check "Agent-only strings absent from the drafts"; Flags 5 says it generically |
| 8 | General mode: state rules were not checked; no Utah rule applied | Pass | Flags 1; Check before sending, "State rules" row; no Utah citation in the output |
| 9 | Property facts only from the portal email | Pass | First Email; Check before sending row 1 quotes the email; objective check "Numbers not found in the input": none |
| 10 | The call opener's first sentence names Parker, the brokerage and the reason; voicemail 50 words or fewer | Pass | Objective checks (46 words) |
| 11 | Day 1 and Day 3 are a call and an email each, and the output ends with Check before sending | Pass | Day 1 and Day 3 Touches |

## The Fix

The first draft's email said "For safety and schools, the best answers come straight from the public sources," and the call opener said "the public sources for safety and schools." That names the topic, not an opinion, but "safety" is the kind of word the skill keeps out of drafts, and the objective check flagged it. Both now say "your questions about the area and the schools." SKILL.md and the guide now list "safety" with "safe" and say to call it "your questions about the area."

## Objective Checks

`objective-checks.txt`: every check passes. Note: 13 is Day 3, worked out from today and marked in Check before sending.
