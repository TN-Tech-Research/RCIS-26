#!/usr/bin/env python3
"""
Fetch the RCIS SharePoint list and write export.csv to the project root.

Setup:
    pip install Office365-REST-Python-Client

Credentials (do NOT commit these):
    export SP_USER="your.username@tntech.edu"
    export SP_PASS="your password"

Or create a .env file in the project root (it is gitignored):
    SP_USER=your.username@tntech.edu
    SP_PASS=your password

Then run:
    python3 scripts/fetch-export.py
"""

import csv, os, sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Load .env if present (no dependency needed — just key=value lines)
# ---------------------------------------------------------------------------
env_file = Path(__file__).parent.parent / '.env'
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

SP_USER = os.environ.get('SP_USER', '')
SP_PASS = os.environ.get('SP_PASS', '')

if not SP_USER or not SP_PASS:
    sys.exit(
        'Error: set SP_USER and SP_PASS as environment variables or in a .env file.\n'
        '  SP_USER=your.username@tntech.edu\n'
        '  SP_PASS=your password'
    )

try:
    from office365.sharepoint.client_context import ClientContext
    from office365.runtime.auth.user_credential import UserCredential
except ImportError:
    sys.exit('Missing dependency — run: pip install Office365-REST-Python-Client')

# ---------------------------------------------------------------------------
# SharePoint connection (from query.iqy)
# ---------------------------------------------------------------------------
SITE_URL  = 'https://tennesseetechuniversity.sharepoint.com/sites/ResearchDay'
LIST_GUID = 'c1debf55-af98-45c8-8acb-5eee84908a80'

# Columns to include in export.csv, in order
OUT_COLS = [
    'Project Number',
    'Primary Author',
    'Project Authors',
    "Primary Author's Classification",
    "Primary Author's College",
    "Primary Author's Department",
    'Faculty advisor',
    'Abstract',
    'Project Type',
    'Project Title',
    'Publication Consent',
    'Human subjects',
    'Use of AI',
    'Department',
    'AdvisorDept',
    'AI Details',
    'IRB Number',
    'IACUC Number',
    'ExternalEmails',
    'English Paper Publication Consent',
    'LateConsent',
    'Unit',
    'College',
    'IRB number',
    'IACUC No.',
    'Year',
    'Ref',
]

# ---------------------------------------------------------------------------
# Connect
# ---------------------------------------------------------------------------
print(f'Connecting to {SITE_URL} as {SP_USER}...')
try:
    ctx = ClientContext(SITE_URL).with_credentials(UserCredential(SP_USER, SP_PASS))
    ctx.web.get().execute_query()
    print(f'Connected: {ctx.web.title}')
except Exception as e:
    sys.exit(
        f'Authentication failed: {e}\n\n'
        'If TTU uses SSO/ADFS this credential flow may be blocked.\n'
        'Alternative: export the list manually from the SharePoint UI\n'
        '(List → Export → Export to CSV) and drop it in the project root.'
    )

# ---------------------------------------------------------------------------
# Discover field internal names (display name → internal name)
# ---------------------------------------------------------------------------
print('Fetching field schema...')
sp_list = ctx.web.lists.get_by_id(LIST_GUID)
fields = sp_list.fields.filter("Hidden eq false")
ctx.load(fields)
ctx.execute_query()

display_to_internal: dict[str, str] = {}
for f in fields:
    display_to_internal[f.title] = f.internal_name

missing = [c for c in OUT_COLS if c not in display_to_internal]
if missing:
    print(f'Warning: these columns were not found in the SharePoint list: {missing}')

select_internals = [display_to_internal[c] for c in OUT_COLS if c in display_to_internal]
internal_to_display = {v: k for k, v in display_to_internal.items()}

# ---------------------------------------------------------------------------
# Fetch all items (handles lists > 100 rows via get_all)
# ---------------------------------------------------------------------------
print('Fetching list items...')
all_items: list = []

def on_page(items):
    all_items.extend(items)
    print(f'  ...fetched {len(all_items)} rows so far')

sp_list.items.select(select_internals).get_all(500, on_page).execute_query()

if not all_items:
    sys.exit('No items returned from SharePoint list.')

print(f'Total rows: {len(all_items)}')

# ---------------------------------------------------------------------------
# Write export.csv
# ---------------------------------------------------------------------------
out_path = Path(__file__).parent.parent / 'export.csv'

with open(out_path, 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.DictWriter(f, fieldnames=OUT_COLS, extrasaction='ignore')
    writer.writeheader()
    for item in all_items:
        row = {}
        for internal in select_internals:
            display = internal_to_display.get(internal, internal)
            val = item.properties.get(internal)
            row[display] = '' if val is None else str(val)
        writer.writerow(row)

print(f'Written: {out_path}')
