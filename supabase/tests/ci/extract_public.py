#!/usr/bin/env python3
"""Keep only the `public` schema objects from a pg_dump plain-SQL file (drops auth, storage, etc.)."""
import re, sys

text = open(sys.argv[1]).read()
parts = re.split(r'(?m)^--\n(?=-- Name: )', text)
keep = [parts[0]] if parts else []
head = re.compile(r'-- Name: (.*?); Type: ([A-Z ]+); Schema: ([^;]*);')
for block in parts[1:]:
    m = head.match(block)
    if not m:
        continue
    schema = m.group(3).strip()
    kind = m.group(2)
    if schema == 'public' and kind not in ('SCHEMA',):
        keep.append('--\n' + block)
sys.stdout.write('\n'.join(keep))
