"""The net sheet arithmetic for each run, done in code as SKILL.md step 7 says, so a grader can rerun it.

python3 skills/listing-appointment-prep/evals/make/net_sheet_math.py [case]

Every input below is copied from that case's files or prompt (named in the comments); nothing is a default.
Prints each line and total to the cent. objective_checks.py imports CASES to hold each output's totals to these.
"""
import sys
from decimal import ROUND_HALF_UP, Decimal

D = Decimal


def cents(x):
    return D(x).quantize(D("0.01"), rounding=ROUND_HALF_UP)


def band(price, rates):
    for lo, hi, premium in rates:
        if lo <= price <= hi:
            return D(premium)
    raise ValueError(f"no rate band for {price}")


CASES = {
    # Practice: prompt (scenarios, 2% buyer line), menu (2.5% fee), Sample Summit Title fee sheet, payoffs from the
    # questionnaire and the FUB note (two liens: the mortgage and the HELOC).
    "practice": {
        "scenarios": [749000, 775000],
        "fee_rate": D("0.025"),
        "fixed": [("Escrow and settlement fee, seller's portion", D("450")), ("Deed preparation", D("125"))],
        "per_lien": [("Lien release tracking (reconveyance)", D("65")), ("Recording fee, release document", D("40")),
                     ("Payoff delivery (courier or overnight)", D("35"))],
        "liens": 2,
        "rates": [(650001, 700000, "2016"), (700001, 750000, "2120"), (750001, 800000, "2224"), (800001, 850000, "2328")],
        "payoffs": [("Mortgage payoff", D("318000")), ("HELOC payoff", D("24500"))],
        "optional": [("Buyer's brokerage at 2%", "rate", D("0.02"))],
    },
    # Eval 1: prompt (scenarios, 2.75% fee, $10,000 flat buyer line), Example Canyon Title fee sheet, payoff and the
    # carpet credit from the questionnaire (one lien).
    "eval-1-full-set-two-prices": {
        "scenarios": [489000, 510000],
        "fee_rate": D("0.0275"),
        "fixed": [("Settlement fee, seller", D("395"))],
        "per_lien": [("Reconveyance fee", D("50")), ("Recording, release of lien", D("40")), ("Overnight payoff delivery", D("30"))],
        "liens": 1,
        "rates": [(400001, 450000, "1512"), (450001, 500000, "1598"), (500001, 550000, "1684"), (550001, 600000, "1770")],
        "payoffs": [("Mortgage payoff", D("142000"))],
        "optional": [("Buyer's brokerage, flat", "flat", D("10000")), ("Carpet credit", "flat", D("5000"))],
    },
    # Eval 2: prompt (scenarios, 2.5% fee); no fee sheet, so no title or escrow lines; payoff from the FUB note.
    "eval-2-no-menu-no-fee-sheet": {
        "scenarios": [465000, 480000],
        "fee_rate": D("0.025"),
        "fixed": [],
        "per_lien": [],
        "liens": 1,
        "rates": None,
        "payoffs": [("Mortgage payoff", D("205000"))],
        "optional": [],
    },
}


def compute(case):
    c = CASES[case]
    out = []
    for price in c["scenarios"]:
        p = D(price)
        lines = [("Listing brokerage fee", cents(p * c["fee_rate"]))]
        if c["rates"]:
            lines.append(("Owner's policy premium", cents(band(price, c["rates"]))))
        lines += [(n, cents(v)) for n, v in c["fixed"]]
        lines += [(n, cents(v * c["liens"])) for n, v in c["per_lien"]]
        costs = sum(v for _, v in lines)
        payoffs = sum(v for _, v in c["payoffs"])
        net = cents(p - costs - payoffs)
        opts = []
        running = net
        for name, kind, v in c["optional"]:
            amt = cents(p * v) if kind == "rate" else cents(v)
            running = cents(running - amt)
            opts.append((name, amt, running))
        out.append({"price": p, "lines": lines, "costs": cents(costs), "payoffs": cents(payoffs), "net": net, "optional": opts})
    return out


def main():
    cases = sys.argv[1:] or list(CASES)
    for case in cases:
        print(f"== {case}")
        for s in compute(case):
            print(f"  Scenario ${s['price']:,}")
            for n, v in s["lines"]:
                print(f"    {n}: ${v:,}")
            print(f"    Costs: ${s['costs']:,}  Payoffs: ${s['payoffs']:,}  Net before open items: ${s['net']:,}")
            for n, amt, running in s["optional"]:
                print(f"    Optional {n}: ${amt:,} -> net ${running:,}")


if __name__ == "__main__":
    main()
