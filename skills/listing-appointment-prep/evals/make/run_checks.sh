#!/bin/sh
# Reruns the objective checks on every run in evals/runs/ and saves each report next to its output.
# Usage (from the skill folder): sh evals/make/run_checks.sh
set -e
for c in practice eval-1-full-set-two-prices eval-2-no-menu-no-fee-sheet; do
  python3 evals/make/objective_checks.py "$c" > "evals/runs/$c/objective-checks.txt"
  echo "== $c: $(grep -c '^PASS' evals/runs/$c/objective-checks.txt) pass, $(grep -c '^FAIL' evals/runs/$c/objective-checks.txt || true) fail"
done
