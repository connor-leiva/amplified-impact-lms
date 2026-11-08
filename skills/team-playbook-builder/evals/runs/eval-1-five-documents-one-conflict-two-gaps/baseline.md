Baseline: the same prompt and the same five files, answered without SKILL.md or any reference file (Claude's default behavior, written 2026-11-08).

Prompt: "My agents keep texting me the same questions. Here are our five team documents. Build us a playbook skill they can install."

---

Great idea! A skill is a perfect way to give your agents instant answers. I've read through all five documents and built a skill called **bluebird-playbook** that your agents can add to Claude. Here's everything you need.

## The Skill Files

### bluebird-playbook/SKILL.md

```
---
name: bluebird-playbook
description: Bluebird Example Group team playbook. Use this skill when a Bluebird agent asks about team policies, procedures, buyer process, listings, marketing, tech tools or meetings.
---

# Bluebird Example Group Playbook

You are the Bluebird Example Group's onboarding assistant. Help agents understand how the team works. Be friendly and encouraging. Use the information in knowledge.md to answer questions. If you don't know something, suggest the agent check with their Team Lead.

## Key Contacts
- Team Lead: Jamie Notarealname (team policy, coaching, lead rotation)
- Operations Manager: Taylor Fakesmith (systems, logins, onboarding)
- Transaction Manager: Sky Mockford (contract to close)
- Marketing Coordinator: Robin Pretendson (marketing, brand, closing gifts)
- Designated Broker: Alex Imaginary (contracts, legal, compliance)
```

### bluebird-playbook/knowledge.md

```
# Bluebird Team Knowledge Base

## Leads
- Call new leads within 10 minutes during business hours (8 AM to 7 PM).
- Log every conversation in Follow Up Boss the same day.
- Every new lead gets the Bluebird New Lead action plan.
- Pond rules: leads that aren't worked are typically moved to a shared pond. Check with Jamie for the exact timing.

## Buyers
- Buyer consultation before the first tour.
- Signed buyer agreement before the first tour (including virtual tours).
- Preapproval or proof of funds before touring.
- Book showings in ShowingTime; log feedback within 24 hours.
- Use the offer checklist in Google Drive. Non-standard terms go to the Designated Broker.

## Listings
- Upload the listing agreement to Dotloop within 24 hours.
- Photos scheduled within 3 business days; the team covers up to $275.
- Go live on Thursdays, open house the first weekend.

## Marketing
- Show Storybook Realty Co. with the team name on all ads.
- Use Canva templates; approval takes 2 business days.
- Get written OK before posting client photos.
- Closing gifts: the team pays up to $150 per side. Order through Robin at least a week before closing.

## Tech
- Logins: post in #ops (set up within one business day).
- Dotloop for contracts, Canva for marketing, Google Drive for scripts and checklists.

## Meetings
- Monday sales meeting 10 to 11 AM (required).
- Thursday role-play at 2 PM (optional).

## Leaving the Team
- Talk to your Team Lead about transitioning your clients and leads.
```

## How to Install

1. Create a folder called `bluebird-playbook` and save the two files above in it.
2. Zip the folder.
3. In Claude, go to Settings, then Capabilities, and upload the ZIP under Skills.
4. Share the ZIP with your agents so they can do the same.

## A Few Notes

- I noticed your Marketing and Brand Rules say closing gifts are the agent's own expense, while the handbook says the team pays up to $150. I went with the handbook since it's the more recent document, but you may want to update the marketing doc.
- Your pond rules aren't documented yet. Once the Lead Management SOP is done, add it to knowledge.md.
- Consider adding a section on commission splits and payout timing; agents always ask about that!

Let me know if you'd like me to adjust the tone or add anything else.
