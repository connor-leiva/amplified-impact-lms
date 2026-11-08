#!/bin/sh
# Reruns the objective checks on every run in evals/runs/ with the arguments each case needs.
# Usage (from the skill folder): sh evals/make/run_checks.sh
set -e
C=evals/make/objective_checks.py
prompt() { python3 -c "import json,sys;print(json.load(open('evals/evals.json'))['evals'][int(sys.argv[1])]['prompt'])" "$1"; }

R=evals/runs/eval-1-four-home-tour
python3 $C $R/output.md "$(prompt 0)" evals/files/eval-1-four-home-tour/*.pdf --refs --forbid 4590,8812 \
  --sheet-forbid '$5,000|11/17|$3,000|20 units|waitlist|sewer backed|backup|limited disclosure|$150|12/15|cats|vacant' \
  --computed '10,000;34,000;15,000;2,060;2,050;40;100;14,000;20,000' > $R/objective-checks.txt
python3 $C $R/baseline.md "$(prompt 0)" evals/files/eval-1-four-home-tour/*.pdf --forbid 4590,8812 \
  --computed '10,000;34,000;15,000' > $R/baseline-objective-checks.txt || true

R=evals/runs/eval-2-criteria-and-status
python3 $C $R/output.md "$(prompt 1)" evals/files/eval-2-criteria-and-status/*.pdf "evals/files/eval-2-criteria-and-status/Buyer Note - Follow Up Boss.txt" \
  --refs --forbid 6623,1047 --sheet-forbid '11/16|second lien|60 to 90|relocat|denied|quick close|prior buyer|Make-Believe Mortgage|month-to-month' \
  --computed '44,000;20,000;2,060;70;24,000' > $R/objective-checks.txt

R=evals/runs/eval-3-general-mode-arizona
python3 $C $R/output.md "$(prompt 2)" evals/files/eval-3-general-mode-arizona/*.pdf --refs --forbid 7719,3456,2201 \
  --sheet-forbid 'is green|pump|portal|proof of funds|$118|qualify|dog|vacant|REO' --computed '26,000;480,000' > $R/objective-checks.txt

R=evals/runs/practice
python3 $C $R/output.md "I'm showing these four homes to Sam and Alex tomorrow at 4. MLS sheets and my Follow Up Boss note are attached. Prep me and make a tour sheet I can hand them." \
  practice/*.pdf "practice/05 Buyer Criteria Note - Follow Up Boss.txt" --refs --forbid 3197,2580 \
  --sheet-forbid '9 of 9|waitlist|$1,850|special assessment|roots|sewer line|limited|personal representative|rent-back|transfer fee|12/31|11/16|01/05|multiple offers|dog' \
  --computed '40,000;15,000;24,900;2,410;1,560;20,000' > $R/objective-checks.txt

for f in evals/runs/*/objective-checks.txt; do echo "== $f: $(grep -c '^PASS' $f) pass, $(grep -c '^FAIL' $f) fail"; done
