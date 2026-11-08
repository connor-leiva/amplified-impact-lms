"""Writes the made-up transcripts for appointment-follow-up: the practice file and the three eval cases.

Run from anywhere:  python3 skills/appointment-follow-up/evals/make/make_files.py

Every person, lender, brokerage, title company and street here is made up. Each file says so at the top.
The shapes follow what each tool hands an agent (checked 2026-11-08, sources in references/follow-up-guide.md):
- Granola desktop on a video call: the agent's microphone and the call's system audio are separate labels.
- Granola desktop at a kitchen table: everyone talks into the laptop microphone, so every turn has one label.
- Granola on iPhone, in person: Speaker A, Speaker B, no names.
- Zoom cloud recording audio transcript: a WebVTT file with each cue as "Display Name: text".
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
PRACTICE = SKILL / "practice"
FILES = SKILL / "evals" / "files"


def granola_desktop(header, turns):
    """turns: list of (m:ss, label, text)."""
    lines = header + [""]
    for ts, label, text in turns:
        lines.append(f"[{ts}] {label}: {text}")
    return "\n".join(lines) + "\n"


def granola_mobile(header, turns):
    """turns: list of (label, text). Granola on iPhone labels speakers by letter."""
    lines = header + [""]
    for label, text in turns:
        lines.append(f"{label}: {text}")
        lines.append("")
    return "\n".join(lines)


def vtt(note, cues):
    """cues: list of (speaker, text). Timings from word counts, about 2.6 words a second plus a pause."""
    out = ["WEBVTT", "", f"NOTE {note}", ""]
    t = 2.0
    for i, (speaker, text) in enumerate(cues, 1):
        dur = max(1.6, len(text.split()) / 2.6)
        start, end = t, t + dur
        out += [str(i), f"{stamp(start)} --> {stamp(end)}", f"{speaker}: {text}", ""]
        t = end + 0.7
    return "\n".join(out)


def stamp(sec):
    h = int(sec // 3600)
    m = int(sec % 3600 // 60)
    s = sec % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


# --- Practice: a move-up buyer consult on Zoom, Granola desktop (agent on the microphone, buyers on system audio)

PRACTICE_HEADER = [
    "PRACTICE FILE: made-up example. Every name, company and street is fictional.",
    "Granola transcript",
    "Meeting: Buyer consult, Morgan and Casey Testwood (Zoom)",
    "Date: Sunday, November 8, 2026, 6:30 PM",
    "Attendees: Riley Sampleton (Sample Realty Group), Morgan Testwood, Casey Testwood",
    "Labels: Microphone is the computer running Granola. System audio is everyone on the call.",
]
M, S = "Microphone", "System audio"
PRACTICE_TURNS = [
    ("0:00", M, "Hey, you two. Can you hear me okay?"),
    ("0:03", S, "Yep, we're both here. Casey's on the couch with me."),
    ("0:07", M, "Perfect. Before we start, mind if I run my notetaker? It just transcribes so I can send you a clean recap instead of scribbling."),
    ("0:14", S, "Sure, that's fine."),
    ("0:16", S, "Fine with me too."),
    ("0:18", M, "Great. So tonight I mostly want to listen. Tell me what's going on and what made you start looking."),
    ("0:25", S, "So, it's Morgan. The short version is we're out of room. We're in the townhome in Herriman, the one on Example Ridge Way, it's three bedrooms, and Casey's mom is moving in with us after the first of the year."),
    ("0:38", M, "Okay. And when you say after the first of the year, is there a date?"),
    ("0:42", S, "This is Casey. She's selling her place in January, so we'd love to be in something by the end of February. And I start at the Lehi office March 1, so that's kind of the real deadline. Right now I drive to Sandy, so the commute flips."),
    ("0:58", M, "Got it. So in the new place by the end of February, March 1 at the latest, and Lehi becomes the commute."),
    ("1:05", S, "Right."),
    ("1:06", M, "What does the house need to have? Let's start with the must-haves."),
    ("1:10", S, "Four bedrooms minimum. And one of them has to be on the main floor with a full bathroom close by. Mom had her hip replaced last spring and stairs are hard for her."),
    ("1:21", M, "Okay, a main-floor bedroom and a full bath on the main. Is a step at the front door a problem?"),
    ("1:27", S, "Ideally no steps, or like one. The garage entry could work if it's level."),
    ("1:32", M, "Good to know. What else?"),
    ("1:34", S, "A garage, two car at least. A yard, doesn't have to be huge, but Morgan wants a garden."),
    ("1:40", S, "Raised beds. I'm not asking for a farm."),
    ("1:43", M, "Noted. Any areas?"),
    ("1:45", S, "Riverton, South Jordan, maybe the west side of West Jordan. Somewhere between Lehi and where we are now so we can keep our friends."),
    ("1:53", M, "And anything that's a deal-breaker?"),
    ("1:56", S, "Backing onto Bangerter, or any big road. We have that now with the townhome and the noise is the worst."),
    ("2:03", S, "And no HOA if we can help it. Or a small one. We pay 285 a month now and it drives me nuts."),
    ("2:10", M, "Okay, so busy roads are out, and you'd prefer no HOA or a light one. Price-wise, where do you want to be?"),
    ("2:17", S, "We'd like to be around 650. 700 is the absolute top, and honestly that's with the townhome sold."),
    ("2:24", M, "Have you talked to a lender yet?"),
    ("2:26", S, "Yeah, we're preapproved with Dana Fakerson at Placeholder Mortgage. Conventional. The letter's dated October 30th and it's for 690."),
    ("2:35", S, "But Dana said the 690 assumes we sell the townhome first. We still owe about 180 on it."),
    ("2:41", M, "That's really helpful. So the big question is the order: sell first, or buy first. Would it be okay if I called Dana tomorrow to talk through what buying before the townhome sells would look like? I'm not going to dig into your finances, I just want us all working off the same plan."),
    ("2:55", S, "Yes, please do. That's the part that keeps me up at night. Carrying two payments."),
    ("3:00", S, "And the opposite. Selling first and having nowhere to go with Mom moving in."),
    ("3:05", M, "Totally fair. Those are the two risks, and there are ways to handle both, but Dana's piece comes first. On the townhome, do you want me to come walk through it and give you a realistic range?"),
    ("3:14", S, "Yes. Can you do Tuesday? After six is best."),
    ("3:17", M, "Tuesday at 6:30 at your place?"),
    ("3:20", S, "Works."),
    ("3:21", M, "Great. I'll bring the recent sales from your complex. Now, a couple of quick things you asked in your text. Morgan, you asked whether the south end of Riverton is a safe area."),
    ("3:30", S, "Yeah, a friend said there have been break-ins."),
    ("3:33", M, "That's a fair question, and I'm going to point you to the source instead of giving you my opinion. The police department publishes its own crime map, and I'll send you that link. Same for schools: the district's boundary lookup is the source of truth for which school a house goes to."),
    ("3:47", S, "Okay, that's fine."),
    ("3:49", M, "The other thing before we see anything is our buyer agreement. It's the paperwork that says I'm representing you, for how long, and what my brokerage is paid. Everything in it is negotiable. I'll send it through DocuSign tonight and you can read it and ask me anything. It does need to be signed before we tour."),
    ("4:05", S, "How long is it for?"),
    ("4:07", M, "The one I'll send runs three months, through February 8th, but we can talk about that."),
    ("4:13", S, "Okay, three months seems fine. We'll read it."),
    ("4:16", M, "And when do you want to start looking? There are three I'd want you to see that hit almost everything."),
    ("4:22", S, "Saturday morning?"),
    ("4:24", M, "Saturday at 10. I'll set up the route and send you the addresses Thursday."),
    ("4:29", S, "Perfect."),
    ("4:31", M, "And I'll have your search set up in the portal by tomorrow night so you'll get new listings as they hit."),
    ("4:36", S, "Can you make it text me instead of email? I never check email."),
    ("4:40", S, "That's Casey. I'm the opposite. Email me."),
    ("4:43", M, "I'll set it so Casey gets texts and Morgan gets email. Anything else on your mind?"),
    ("4:49", S, "Just, we haven't done this in eight years. We don't want to rush, but we also can't miss March."),
    ("4:55", M, "Got it. Okay, recap from my side. I'll send the buyer agreement tonight, call Dana tomorrow, have the search running tomorrow night, send Saturday's addresses Thursday, and I'll see you Tuesday at 6:30 at the townhome. You'll read the agreement and sign it before Saturday. Sound right?"),
    ("5:13", S, "Sounds right. Oh, and Biscuit says hi."),
    ("5:16", M, "Ha. Tell Biscuit I'll bring treats Tuesday."),
]

# --- Eval 1: a first-time buyer over coffee, Granola on iPhone. Preapproval pending, no buyer agreement mentioned.

EVAL1_HEADER = [
    "EVAL FILE: made-up example. Every name, company and street is fictional.",
    "Granola (iPhone) transcript",
    "Coffee with Quinn Mockridge",
    "Sat, Nov 7, 2026, 10:04 AM",
]
A, B = "Speaker A", "Speaker B"
EVAL1_TURNS = [
    (A, "Okay, I've got my notetaker going on my phone, it just helps me not miss anything. That okay?"),
    (B, "Totally."),
    (A, "So tell me where you're at. First time buying, right?"),
    (B, "Yeah. I've rented for six years and my lease is up at the end of March, and I just feel like I'm throwing money away."),
    (A, "End of March. Does your landlord let you go month to month after that?"),
    (B, "I asked. They said yes, but it goes up 150 a month, so I'd rather not."),
    (A, "Makes sense. So ideally you're closed before your lease ends at the end of March."),
    (B, "Yes. Ideally I move in by like mid-March so I'm not paying double forever."),
    (A, "What are you picturing?"),
    (B, "A townhome or a condo, two bedrooms, maybe three if it's in budget. I work in Murray, so close to that. Like 20 minutes max."),
    (A, "Any areas you already like?"),
    (B, "Murray, Midvale, Taylorsville, maybe Millcreek."),
    (A, "Must-haves?"),
    (B, "In-unit laundry, for sure. I've done the shared laundry thing. A garage or at least covered parking. And I have a dog, Pepper, so I need somewhere that allows dogs, and a little patch of grass would be amazing."),
    (A, "Okay, pet rules are an HOA thing, so I'll check the rules on anything we look at, including size limits. How big is Pepper?"),
    (B, "Like 45 pounds."),
    (A, "Good to know, some HOAs have weight limits. Budget?"),
    (B, "I want to stay under 400. My monthly needs to stay under like 2,200 all in."),
    (A, "Have you talked to a lender?"),
    (B, "I applied with Sample State Credit Union on Tuesday. Pat Notreal is the loan officer."),
    (A, "Pat said she just needs my last two pay stubs and two months of bank statements, and then she can issue the preapproval."),
    (A, "Okay, so you're not preapproved yet, it's in process."),
    (B, "Right. I'll send them Monday. My credit's like 712, she said that's fine. I've got about 31,000 in student loans though, so I'm nervous about that."),
    (A, "Pat's the right person for that question, so I'll leave the numbers to her. Would it help if I connected you with a second lender, just so you can compare?"),
    (B, "Yeah, actually. My coworker said to always get two quotes."),
    (A, "I'll text you a name today. And did Pat mention anything about down payment help?"),
    (B, "Yeah, she said there might be a down payment assistance program I qualify for. She's checking."),
    (A, "Good. Ask her about that Monday when you send the pay stubs. Anything worrying you?"),
    (B, "Honestly, just HOA fees. My friend bought a condo and the HOA went up like crazy. And I don't want to get into a bidding war."),
    (A, "Both fair. On HOAs, when we find one you like, we'll get the budget and the meeting minutes so you can see if increases are coming. On bidding wars, we'll talk strategy house by house."),
    (B, "Okay. When can we start looking?"),
    (A, "Let's get a search going first. I'll set you up today with alerts, and by Monday I'll send you my top five from what's out there. If any of them look good, we could see some next Saturday."),
    (B, "Next Saturday works. Morning?"),
    (A, "Let's say 11?"),
    (B, "11's great."),
    (A, "And let's touch base Wednesday evening on the phone, after you've heard from Pat, and we'll lock in which ones to see."),
    (B, "Perfect."),
    (A, "I'll also send you that checklist of what to have ready for the lender, and the list of questions I ask every HOA."),
    (B, "Amazing. Thank you so much."),
    (A, "Of course. Say hi to Pepper."),
]

# --- Eval 2: a listing appointment at the kitchen table in Mesa, Arizona (general mode). Granola desktop, so every
# turn is "Microphone". The sellers want a higher price than the agent recommends, and one seller names the loan balance.

EVAL2_HEADER = [
    "EVAL FILE: made-up example. Every name, company and street is fictional.",
    "Granola transcript",
    "Meeting: Listing appt, Lee and Sam Fictionale, 4821 E Example Mesa Dr, Mesa AZ",
    "Date: Sunday, November 8, 2026, 2:00 PM",
    "Attendees: Drew Sampleman, Lee Fictionale, Sam Fictionale",
]
EVAL2_TURNS = [
    ("0:00", M, "Thanks for having me. Before we dig in, I run a notetaker on my laptop so I can send you a clean recap. Okay with you both?"),
    ("0:06", M, "Sure, go ahead."),
    ("0:08", M, "Fine by us."),
    ("0:10", M, "Great. So, tell me what's behind the move."),
    ("0:14", M, "It's Lee. We're moving down to Tucson. Our daughter's there and we want to be closer. We've got a rental lined up starting February 1st."),
    ("0:24", M, "So ideally the house is sold and closed before then?"),
    ("0:27", M, "That's the hope. Sam wants to close by mid-January so we're not paying for two places."),
    ("0:33", M, "Mid-January, yes. I'm not paying rent and a mortgage at the same time. We still owe about 212 on this place, so it's not nothing."),
    ("0:41", M, "Understood. When would you want to be on the market?"),
    ("0:44", M, "Before Thanksgiving if we can."),
    ("0:47", M, "Okay. Let's walk through what I found. I pulled every sale in your neighborhood and the ones like it from the last six months. The closest ones point to somewhere between 529 and 545. My recommendation is to list at 539,900."),
    ("1:02", M, "Huh. That's lower than we were thinking."),
    ("1:05", M, "What were you thinking?"),
    ("1:07", M, "575. Our neighbor two doors down sold for 570 in the spring, and Zillow has us at 563."),
    ("1:14", M, "That's a fair thing to look at. The one two doors down had the pool and the remodeled kitchen, and it closed in April. Since then, the two that closed without a pool came in at 531 and 538. I'm happy to show you the comps side by side."),
    ("1:28", M, "I hear you, but I'd rather start at 575 and come down if we need to."),
    ("1:32", M, "That's your call to make, and I want you to make it with the numbers in front of you. Can I send you the full CMA tonight and you two look at it together?"),
    ("1:40", M, "Yeah, send it."),
    ("1:42", M, "And I'll ask Example Title for a net sheet at both prices, 539,900 and 575, so you can see what you'd walk away with either way. I'll have that to you by Wednesday."),
    ("1:51", M, "That would help. Sam's the numbers person."),
    ("1:54", M, "I am the numbers person."),
    ("1:56", M, "Okay. What worries you most about selling?"),
    ("2:00", M, "The dogs. We have two and they bark at everything. I don't know how we do showings."),
    ("2:06", M, "And honestly, sitting on the market. The house on the corner sat for like 90 days and everybody wondered what was wrong with it."),
    ("2:13", M, "Both real. For the dogs, we can set showings with notice so you can take them out. On sitting, that's exactly why I want the price right on day one. Okay, let's walk the house. What would you be willing to do before photos?"),
    ("2:24", M, "We could paint the front door. It's faded."),
    ("2:27", M, "Great. The garage door spring is making noise, that's worth fixing. My handyman, Chris at Sample Fix-It, does those. I'll text you his number."),
    ("2:35", M, "And the oleanders out front are blocking the windows."),
    ("2:38", M, "Sam, can you handle trimming those?"),
    ("2:40", M, "I'll do the oleanders this weekend. Not this weekend, next weekend."),
    ("2:44", M, "Okay. And then a deep clean and pack up the extra stuff in the office and the garage. I'll send you my photo prep list."),
    ("2:50", M, "When are photos?"),
    ("2:52", M, "If we decide on Thursday, I can get the photographer out Tuesday the 17th, and we'd go live Friday the 20th."),
    ("2:59", M, "That's before Thanksgiving."),
    ("3:01", M, "It is. So here's what I'd suggest. You look at the CMA tonight, the net sheet by Wednesday, and I come back Thursday at 6 and we decide on price and sign the listing paperwork."),
    ("3:12", M, "Thursday at 6 works."),
    ("3:14", M, "And Drew, one question. If we go at 575 and nothing happens in two weeks, then what?"),
    ("3:19", M, "Then we'd look at the activity together and talk about the next step. I can't promise what the market will do, but I'll tell you exactly what I'm seeing every week."),
    ("3:28", M, "Okay. Fair."),
    ("3:30", M, "Thanks, you two. I'll get the CMA over tonight."),
]

# --- Eval 3: a relocation buyer consult on Zoom (cloud recording audio transcript, .vtt). One buyer makes a remark
# about who lives in a neighborhood, the other asks about schools. Buyers are in Washington; the agent is in Utah.

K, E, J = "Kendall Testagent", "Ellis Fakewell", "Jordan Fakewell's iPad"
EVAL3_CUES = [
    (K, "Hi, both of you. Before we start, I'm recording this Zoom so I can send you a recap afterward. Is that okay with you?"),
    (E, "Yes, that's fine."),
    (J, "Yep."),
    (K, "Great. So you're coming from Spokane. Tell me about the move."),
    (E, "My company is moving me to the Salt Lake office. I start January 4th. Our house here is under contract, closing December 18th."),
    (K, "Congrats on getting it under contract. So where are you between December 18th and when you buy?"),
    (J, "We've got a short-term rental in Draper for January and February. So we'd like to close by the end of February, March at the latest."),
    (K, "Okay. What are you looking for?"),
    (E, "Single family, three bedrooms at least, and we have a camper, so RV parking is a must. Like a gate and a side pad, 40 feet."),
    (J, "And a shop or a three-car garage. Ellis builds furniture."),
    (K, "RV parking with at least 40 feet on the side, and a shop or a three-car garage. Lot size?"),
    (E, "A quarter acre or more, probably, to fit all that."),
    (K, "Areas?"),
    (J, "Draper, Riverton, Herriman. Ellis will be downtown, so within 35, 40 minutes."),
    (E, "About that. We drove through a few places when we visited in September. I'll be honest, Example Hollow in Riverton was a lot of big families, kids everywhere, and you heard a lot of Spanish at the park. We'd want somewhere a little more like us."),
    (K, "I hear you. I can't help you choose a neighborhood based on who lives there. That's fair housing, and it applies to me no matter what. What I can do is show you the things that actually separate these areas: lot sizes, HOA rules on RVs, commute times. And you're welcome to visit anywhere and decide for yourselves."),
    (E, "Sure, that's fair."),
    (J, "HOA rules on RVs is a big one, actually. Our HOA here made people move their trailers."),
    (K, "That's a hard filter, then. I'll only send homes with no HOA or an HOA that allows RV parking on the lot, and we'll read the CC&Rs on anything you're serious about."),
    (J, "And how are the schools in Placeholder Heights? A coworker mentioned it."),
    (K, "For schools, I'll point you to the sources: the district's boundary lookup and the state's school report card. I'll send both links so you can see the data yourselves."),
    (J, "Okay, perfect."),
    (K, "Price range?"),
    (E, "Up to 750. We'd love to be closer to 700."),
    (K, "And a lender?"),
    (E, "We're preapproved with Sample Pacific Lending. It's a conventional loan, and the letter's from October. Our loan officer is Rory Fakename."),
    (J, "We'll have about 220 from the Spokane sale for the down payment."),
    (K, "Great, I'll leave the numbers to your lender. Does your preapproval need updating for Utah?"),
    (E, "Rory said he can lend in Utah. He'll update the letter when we have an address."),
    (K, "Perfect. Now, before we look at anything, even on video, we need a written buyer agreement in place. It says I'm representing you and what my brokerage is paid. I'll send it tonight by email for e-signature."),
    (J, "Can we read it first? I want to go through it."),
    (K, "Absolutely. Read it, ask me anything. It just has to be signed before our first tour, and that includes a live video tour."),
    (E, "Makes sense."),
    (K, "So when do you want to see something? I could do live video tours this week of a couple that fit."),
    (J, "Wednesday? After work."),
    (K, "Wednesday at 5 my time, so 4 your time?"),
    (E, "4 Pacific, yes."),
    (K, "And then your trip out here."),
    (J, "We fly in December 4th, Friday, and leave Sunday the 6th."),
    (K, "Okay, so we tour in person Saturday the 5th, all day if you want."),
    (E, "All day."),
    (K, "All right. So from me: the buyer agreement tonight, your search with RV parking and the HOA filter by Monday, the two school links, and I'll pick the two homes for Wednesday's video tour and send them Tuesday. From you: read and sign the agreement before Wednesday."),
    (J, "Sounds great. Text me the Wednesday link, I'm bad with email."),
    (K, "Will do. Talk soon."),
]


def main():
    PRACTICE.mkdir(parents=True, exist_ok=True)
    (FILES / "eval-1-first-time-buyer").mkdir(parents=True, exist_ok=True)
    (FILES / "eval-2-listing-price-gap").mkdir(parents=True, exist_ok=True)
    (FILES / "eval-3-neighborhood-remark").mkdir(parents=True, exist_ok=True)

    (PRACTICE / "Granola transcript, buyer consult, Testwood (practice).txt").write_text(
        granola_desktop(PRACTICE_HEADER, PRACTICE_TURNS), encoding="utf-8")
    (FILES / "eval-1-first-time-buyer" / "Granola iPhone transcript, Coffee with Quinn Mockridge.txt").write_text(
        granola_mobile(EVAL1_HEADER, EVAL1_TURNS), encoding="utf-8")
    (FILES / "eval-2-listing-price-gap" / "Granola transcript, Listing appt Fictionale.txt").write_text(
        granola_desktop(EVAL2_HEADER, EVAL2_TURNS), encoding="utf-8")
    (FILES / "eval-3-neighborhood-remark" / "zoom audio_transcript Fakewell relocation consult.vtt").write_text(
        vtt("EVAL FILE: made-up example. Every name, company and street is fictional.", EVAL3_CUES), encoding="utf-8")
    print("wrote practice and eval files")


if __name__ == "__main__":
    main()
