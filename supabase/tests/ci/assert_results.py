#!/usr/bin/env python3
"""Compare test output with expected_results.txt (label | BLOCKED/ALLOWED/...).  --update rewrites the file."""
import re, sys, pathlib

results_file = pathlib.Path(sys.argv[1])
expected_file = pathlib.Path(__file__).with_name('expected_results.txt')
update = '--update' in sys.argv

line_re = re.compile(r'NOTICE:\s+(.*?)(?:\s+\|\s+|:\s+)(BLOCKED|ALLOWED|no rows affected|OK|FAIL[^|]*)', re.I)
got = []
for line in results_file.read_text().splitlines():
    m = line_re.search(line)
    if m:
        label, status = m.group(1).strip(), m.group(2).split()[0].upper()
        got.append(f'{label} | {status}')

if update:
    expected_file.write_text('\n'.join(got) + '\n')
    print(f'wrote {len(got)} expectations')
    sys.exit(0)

expected = expected_file.read_text().splitlines()
bad = [f'  expected: {e}\n       got: {g}' for e, g in zip(expected, got) if e != g]
if len(got) != len(expected):
    bad.append(f'  expected {len(expected)} checks but ran {len(got)}')
if bad:
    print('DATABASE SECURITY TESTS CHANGED:\n' + '\n'.join(bad)); sys.exit(1)
print(f'database security tests: {len(got)}/{len(expected)} as expected')
