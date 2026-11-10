"""Writes the made-up practice files and eval inputs for post-closing-client-care.

python3 -I skills/post-closing-client-care/evals/make/make_files.py

Practice (practice/) and eval 1 (evals/files/eval-1-buyer-closing/) hold the same four files: a TC's
closing email for a buyer purchase in a made-up Utah town in Davis County, the agent's notes, the agent's
vendor list (one vendor with a disclosed family relationship) and the agent's review links (example.com).
Eval 2 is a Sisu transaction copied as text for a seller closing; its notes come in the prompt. Eval 3 is
a Follow Up Boss person copied as text for a buyer in Idaho, the agent's notes and a vendor list with an
affiliated insurance agency and a heating company that pays for referrals. Every name, street, company,
phone number and link is made up; phone numbers use the 555-01xx range set aside for fiction.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
PRACTICE = SKILL / "practice"
FILES = SKILL / "evals" / "files"

TC_EMAIL = """PRACTICE FILE: made-up example. Not a real person, property, brokerage, lender or title company.

From: Kit Placeholder <kit.placeholder@example.com>
To: Sam Testerfield <sam.testerfield@example.com>
Date: Tue, Nov 10, 2026, 3:02 PM
Subject: CLOSED and Recorded: 1482 W Fakewater Ln, Pretend Springs (Mockwood purchase)

Hi Sam,

Great news: the Mockwood purchase is funded and recorded!

Property: 1482 W Fakewater Ln, Pretend Springs, UT 84000
Buyers: Taylor Mockwood and Jamie Mockwood
Our side: Buyer
Sellers: Chris and Robin Notaseller (listing agent: Morgan Sampleford, Placeholder Peaks Realty)
Signed: Monday, 11/09/2026, at Mockingbird Title and Escrow (escrow officer Robin Fakename)
Funded and recorded: Tuesday, 11/10/2026, 2:14 PM, with the Davis County Recorder, Entry No. 3990012
Purchase price: $489,000
Lender: Sample Basin Mortgage (loan officer Lee Notreal), loan no. 77-0042913
Commission: disbursed by wire to the Example Ridge Realty trust account ending 4417
Keys: released to the buyers at 2:30 PM today
Buyer emails: taylor.mockwood@example.com, jamie.mockwood@example.com
Buyer phones: Taylor 801-555-0123, Jamie 801-555-0198
Mailing address after closing: the property address above

Still open on my side:
- Final settlement statement uploaded to the file (done)
- Mark closed in Sisu (done)
- Home warranty: seller-paid 1-year plan from Example Home Shield, confirmation emailed to the buyers

Thanks for a smooth one!

Kit Placeholder
Transaction Coordinator, Example Ridge Realty
"""

NOTES = """PRACTICE FILE: made-up example. Not real people.

My notes: Taylor and Jamie Mockwood, 1482 W Fakewater Ln (buyers, closed 11/10)

- First home for both of them.
- What sold them: the big maple in the backyard and the south-facing kitchen window. Jamie kept saying "the morning light."
- Taylor wants to paint the front room before their couch is delivered and asked me for a painter.
- They plan to replace the old side fence next summer.
- Jamie can't wait to plant a vegetable garden herself in the spring.
- Their corgi, Waffles, ran straight to the backyard at the final walkthrough.
- Jamie told me she's expecting in March.
- They were nervous about the rate. Locked at 6.1% with Lee.
- Texts: Taylor signed our text consent form with the buyer intake on 8/14/2026. Jamie said email only, no texts.
- Closing gift: I'm dropping off a framed sketch of the house and a pie from Sample Street Bakery tonight.
"""

VENDORS = """PRACTICE FILE: made-up example. Not real businesses or people. Phone numbers use the 555-01xx range set aside for fiction.

# My Vendor List: Sam Testerfield, Example Ridge Realty

Updated 2026-10-01. I share these names with clients when they ask. I don't take referral fees or anything else from anyone on this list.

| Trade | Company | Contact | Phone | Notes |
|---|---|---|---|---|
| Painting, interior and exterior | Sample Summit Painting | Dale Fakerson | 801-555-0142 | Relationship: Dale is my brother-in-law. |
| Fencing | Example Fence Co. | Pat Postwell | 801-555-0167 | Vinyl and wood fences. |
| Landscaping | Pretend Gardens Landscaping | Lou Sampleman | 801-555-0118 | Sprinklers, sod, garden beds. |
| Heating and air | Mockingbird Heating and Air | Jo Exampleton | 801-555-0175 | Furnace and AC tune-ups. |
| Handyman | Placeholder Handyman Services | Ash Fakeworth | 801-555-0129 | Small repairs, TV mounting. |
| Plumbing | Fakeflow Plumbing | Rory Mockley | 801-555-0153 | Water heaters, leaks. |
| House cleaning | Sample Sparkle Cleaning | Bo Testwood | 801-555-0186 | Move-in cleans. |
"""

REVIEW_LINKS = """PRACTICE FILE: made-up example. These links go nowhere real.

My review links (Sam Testerfield, Example Ridge Realty)

Google: https://example.com/reviews/google/sam-testerfield
Zillow: https://example.com/reviews/zillow/sam-testerfield
"""

PRACTICE_SET = {
    "PRACTICE Closing email from TC, 1482 W Fakewater Ln.txt": TC_EMAIL,
    "PRACTICE Agent notes, Taylor and Jamie Mockwood.txt": NOTES,
    "PRACTICE Vendor list, Sam Testerfield.md": VENDORS,
    "PRACTICE Review links, Sam Testerfield.txt": REVIEW_LINKS,
}

SISU = """PRACTICE FILE: made-up example. Not a real person, property or brokerage.

Copied from Sisu: Transactions, 742 E Placeholder Ct

Transaction: 742 E Placeholder Ct, Mockville, UT 84000
Client: Dana Exampleton
Secondary Client: Lee Exampleton
Type: Seller
Stage: Closed
Agent: Drew Fakeman
Lead Source: Past Client Referral
Listing Date: 08/28/2026
Under Contract Date: 09/22/2026
Close Date: 10/30/2026
Sale Price: $612,500
GCI: $15,312.50
Client Email: dana.exampleton@example.com
Secondary Client Email: lee.exampleton@example.com
Client Phone: 801-555-0190
Notes: Buyers' agent Casey Placeholder, Sample Summit Realty. Title: Example Valley Title.
"""

FUB_PERSON = """PRACTICE FILE: made-up example. Not a real person, property or brokerage.

Copied from Follow Up Boss: People, Morgan Fakerly

Morgan Fakerly
Stage: Closed
Assigned to: Quinn Placeholder
Tags: Buyer, Relocation
Email: morgan.fakerly@example.com
Phone: 208-555-0134 (mobile)
Address: 915 N Sample Sage Way, Mocktown, ID 83000
Text Consent: Yes - signed buyer intake 2026-07-22
Source: Sample Foothills Realty website
Background: Relocating from Spokane.

Deals
915 N Sample Sage Way
Stage: Closed
Price: $455,000
Close Date: 11/06/2026
Commission: $13,650
Description: Closed and recorded 11/06/2026, Ada County.
"""

FUB_NOTES = """PRACTICE FILE: made-up example. Not real people.

Notes on Morgan Fakerly, 915 N Sample Sage Way (buyer, closed 11/6)

- Loved the covered back patio and the mountain view from the office window.
- Wants the furnace serviced before winter. It's 15 years old.
- Asked me for an insurance agent so she can bundle home and auto.
- Her cat, Juniper, hid in the hall closet during the final walkthrough.
- The appraisal came in low and we renegotiated $8,000 off. Morgan was frustrated with the lender.
- Recovering from knee surgery in December, so no ladder projects for a while.
- Closing gift: a doormat with the house number, dropped off Friday.
"""

FUB_VENDORS = """PRACTICE FILE: made-up example. Not real businesses or people. Phone numbers use the 555-01xx range set aside for fiction.

# Vendors I Recommend: Quinn Placeholder, Sample Foothills Realty

| Trade | Company | Contact | Phone | Notes |
|---|---|---|---|---|
| Home and auto insurance | Example Shield Insurance Agency | Casey Notreal | 208-555-0131 | Affiliated business: Sample Foothills Realty owns 30% of Example Shield. Our AfBA disclosure form is in the brokerage forms library. |
| Heating and cooling | Mockridge Heating and Cooling | Jordan Fakewell | 208-555-0144 | Pays me $50 per referral. |
| Plumbing | Placeholder Plumbing | Sam Pipewell | 208-555-0177 | |
| Cleaning | Pretend Shine Cleaning | Bo Testwood | 208-555-0162 | Move-in and move-out cleans. |
"""

EVAL_FILES = {
    "eval-1-buyer-closing": {
        "Closing email from TC, 1482 W Fakewater Ln.txt": TC_EMAIL,
        "Agent notes, Taylor and Jamie Mockwood.txt": NOTES,
        "Vendor list, Sam Testerfield.md": VENDORS,
        "Review links, Sam Testerfield.txt": REVIEW_LINKS,
    },
    "eval-2-seller-gift-card": {
        "Sisu transaction, 742 E Placeholder Ct.txt": SISU,
    },
    "eval-3-idaho-buyer-vendors": {
        "Follow Up Boss person, Morgan Fakerly.txt": FUB_PERSON,
        "Agent notes, Morgan Fakerly.txt": FUB_NOTES,
        "Vendor list, Quinn Placeholder.md": FUB_VENDORS,
    },
}


def write(path, text):
    for bad in (chr(0x2014), chr(0x2013)):
        assert bad not in text, (path, "dash")
    assert text.startswith("PRACTICE FILE: made-up example"), path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print("wrote", path.relative_to(SKILL))


def main():
    for name, text in PRACTICE_SET.items():
        write(PRACTICE / name, text)
    for case, files in EVAL_FILES.items():
        for name, text in files.items():
            write(FILES / case / name, text)


if __name__ == "__main__":
    main()
