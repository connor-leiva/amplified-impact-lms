"""Writes the made-up practice and eval input files for ai-brain-setup.

python3 skills/ai-brain-setup/evals/make/make_files.py

Every file is made up and says so on its first line. The people, brokerages, teams, logins and phone numbers
are invented; 555-01xx numbers are set aside for fiction. Each QUICK CARD is held under 1,500 characters, as
the voice profile guide (amplifiedimpact.io/voice-profile) writes them. Writes the files and prints their sizes.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]

PRACTICE_ANSWERS = """PRACTICE FILE: made-up example. Every name, brokerage and number here is invented.

# My AI Brain Interview Answers: Juniper Mockwell

My typed answers to the AI Brain Setup interview, all 17 questions.

1. Name and role: Juniper Mockwell. I sign "Juniper." Solo agent, with a part-time assistant.
2. Brokerage and team: Fakewater Realty Group. No team name, it's just me.
3. State and areas: Utah. Mostly Lehi, Saratoga Springs and Eagle Mountain, plus some American Fork.
4. What I'm known for: first-time buyers and young families moving out from Salt Lake for more space. Also a lot of new construction in Saratoga Springs.
5. Team: me plus one part-time assistant, Bree, who handles listing paperwork and my calendar. I use my brokerage's transaction coordinator.
6. CRM: Follow Up Boss.
7. Tools: Google Workspace (Gmail and Calendar), DocuSign, UtahRealEstate.com for the MLS, Canva, ShowingTime.
8. Where my business comes from: about half sphere and past clients, then Zillow Flex leads, then open houses in builder communities.
9. Brokerage rules: Fakewater wants "Fakewater Realty Group" and my phone number on every ad and post. Nothing about a listing goes on social before it's in the MLS. Broker approval for any paid ad.
10. My limits: I don't text anyone who hasn't opted in through my website form or said yes in writing. I don't give a price opinion in writing until I've done a CMA. Builder contracts always go to my broker before the buyer signs.
11. Never: never tell a buyer what a builder will "probably" accept. Never write anything about schools.
12. Goals: 24 closings in 2027, up from 17 this year. Get my past client database to 300 people. Post 3 times a week.
13. Help with: follow-up emails after showings, new construction contract questions to bring to my broker, social captions, and my weekly plan.
14. Answers: short. Bullets are fine. Tell me the answer first.
15. Time zone: Mountain. I work 8 to 6 on weekdays and Saturday mornings. Sign-off: "Talk soon, Juniper"
16. QUICK CARD: yes, it's in the other file.
17. Anything else: I taught elementary school before real estate, so I like explaining things to first-time buyers one step at a time.
"""

PRACTICE_CARD = """PRACTICE FILE: made-up example. A made-up voice profile QUICK CARD for a made-up agent.

QUICK CARD
Write as me. I'm Juniper Mockwell, a real estate agent in Utah County who used to teach second grade and still explains things one step at a time.
1. Short sentences. One idea per sentence. (STRONG)
2. Open with the client's question in their words, then answer it in one line. (STRONG)
3. Numbered steps when I explain a process, never more than five. (STRONG)
4. Exact numbers: $489,900, not "under 500." (MEDIUM)
5. Warm but plain. I say "home," not "property," and "you," not "buyers." (STRONG)
6. One exclamation point per email at most. (MEDIUM)
7. End with one clear next step and a day. (MEDIUM)
8. Emoji: only the house emoji, only on Instagram. (LOW)
Never: "dream home," "nestled," "don't hesitate to reach out," "in today's market," em dashes.
Facts rule: never invent a price, date, stat or client story. Write [VERIFY: what's needed] instead.
Sign-off: Talk soon, Juniper
"""

EVAL1_ANSWERS = """PRACTICE FILE: made-up example. Every name, brokerage, team and number here is invented.

# AI Brain Interview Answers: Sloane Testerfield

Answers typed into a doc before the setup. 17 questions.

1. Sloane Testerfield. I sign "Sloane." I'm the team leader and still list a few homes myself.
2. Brokerage: Placeholder Peaks Realty. Team: The Testerfield Group.
3. Utah. Mostly Davis County (Layton, Kaysville, Farmington) and Weber County (Ogden, North Ogden).
4. We're known for listings in Davis County, move-up sellers, and relocation buyers coming in for Hill Air Force Base.
5. Team: 6 buyer's agents, 2 listing agents, 1 transaction coordinator, 1 ISA, and Marisol, our ops manager. Kenzie, one of our listing agents, is out on maternity leave until February, so route her listings to Theo.
6. CRM: Follow Up Boss. We also use Sisu for goals and accountability.
7. Tools: SkySlope for transactions, DocuSign, Google Workspace, Slack for the team, Canva, and UtahRealEstate.com.
8. Where business comes from: about 40% sphere and referrals, 35% Zillow Flex and Realtor.com leads, 15% past clients, 10% open houses.
9. Brokerage rules: "Placeholder Peaks Realty" in every ad and post, at the same size as the team name or bigger. No "guaranteed sale" or "we'll buy your home" language. Broker review before any new email campaign.
10. Our limits: texts only to leads with the Text Consent field set to Yes in Follow Up Boss. No list price recommendations in writing before a CMA. Agents never discuss splits with clients.
11. Never: never rank or criticize agents by name in anything I share with the team. Never write a deadline as final without "confirm with your TC."
12. Goals for 2027: 118 closings, $61.4M in volume, recruit 3 buyer's agents by June 30, and get every agent to 20 conversations a day.
13. Help with: weekly team meeting prep, coaching notes for agent one-on-ones, recruiting messages, listing launch checklists, and reviewing our Follow Up Boss action plans.
14. Answers: detailed is fine, but give me the decision first. Tables when comparing.
15. Mountain time. 7 AM to 5 PM weekdays. Sign-off: "Onward, Sloane"
16. QUICK CARD attached.
17. One more: our biggest listing this fall was the Brightwater family's house on Example Summit Drive. Use that as a case study.
"""

EVAL1_CARD = """PRACTICE FILE: made-up example. A made-up voice profile QUICK CARD for a made-up team leader.

QUICK CARD
Write as me. I'm Sloane Testerfield. I lead The Testerfield Group in Davis County, Utah, and I coach agents as much as I sell.
1. Decision first, then the why in two or three lines. (STRONG)
2. Short paragraphs, two sentences max. (STRONG)
3. I say "team," never "my agents." (STRONG)
4. Numbers exact, with their source: "118 closings (our 2027 plan)." (MEDIUM)
5. One question at the end, never more. (MEDIUM)
6. Plain words: "talk," not "touch base"; "help," not "leverage." (STRONG)
7. No exclamation points in anything to the team. (MEDIUM)
8. Humor: dry, one line, never at an agent's expense. (LOW)
Never: "crushing it," "rockstar," "game-changer," "circle back," "in today's market," em dashes, emoji in emails.
Facts rule: never invent a number, date or story. Write [VERIFY: what's needed].
Sign-off: Onward, Sloane
"""

EVAL2_MESSAGE = """PRACTICE FILE: made-up example. A made-up chat message. The login, password, names and phone numbers are invented (555-01xx numbers are set aside for fiction).

hey so I'm Casey, I sell houses around Boise. just got claude pro.
I use FUB for everything. my FUB login is casey.notreal@example.test and the password is Bl0ckbuster-Fake-77 so you can pull my leads whenever.
I mostly do buyers I guess.
also remember my clients phone numbers so you can text them for me:
Dana Notreal 208-555-0143
Pat Sampleton 208-555-0178
Lee Mockberry 208-555-0119
I don't have time for a bunch of questions, just set it up
"""

FILES = {
    "practice/PRACTICE Interview answers, Juniper Mockwell.md": PRACTICE_ANSWERS,
    "practice/PRACTICE Voice profile QUICK CARD, Juniper Mockwell.md": PRACTICE_CARD,
    "evals/files/eval-1-team-leader-full/Interview answers, Sloane Testerfield.md": EVAL1_ANSWERS,
    "evals/files/eval-1-team-leader-full/Voice profile QUICK CARD, Sloane Testerfield.md": EVAL1_CARD,
    "evals/files/eval-2-sparse-login-clients/Pasted chat message, Casey.txt": EVAL2_MESSAGE,
}


def card_text(text):
    """The QUICK CARD itself: from "Write as me." to the end."""
    return text[text.index("Write as me."):].strip()


def main():
    for rel, text in FILES.items():
        path = SKILL / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        assert text.startswith("PRACTICE FILE: made-up example"), rel
        assert not any(ch in text for ch in (chr(0x2013), chr(0x2014))), rel
        if "QUICK CARD" in rel:
            assert len(card_text(text)) < 1500, (rel, len(card_text(text)))
        path.write_text(text, encoding="utf-8")
        extra = f", QUICK CARD {len(card_text(text))} characters" if "QUICK CARD" in rel else ""
        print(f"wrote {rel} ({len(text)} characters{extra})")


if __name__ == "__main__":
    main()
