#!/usr/bin/env python3
"""Generate the static version references from VERSION; --check never writes."""
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / 'VERSION').read_text().strip()
if not re.fullmatch(r'\d+\.\d+\.\d+', version):
    raise SystemExit('VERSION must contain MAJOR.MINOR.PATCH')

updates = {}
index = ROOT / 'index.html'
text = index.read_text()
text = re.sub(r'\?v=\d+(?:\.\d+)+', f'?v={version}', text)
text = re.sub(r'Gitbrag version \d+(?:\.\d+)+', f'Gitbrag version {version}', text)
text = re.sub(r'>v\d+(?:\.\d+)+<', f'>v{version}<', text)
text = re.sub(r'Gitbrag v\d+(?:\.\d+)+', f'Gitbrag v{version}', text)
updates[index] = text
manifest_path = ROOT / 'extension/manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest['version'] = version
updates[manifest_path] = json.dumps(manifest, indent=2) + '\n'
popup_path = ROOT / 'extension/popup.html'
updates[popup_path] = re.sub(r'>v\d+(?:\.\d+)+<', f'>v{version}<', popup_path.read_text())
stale = [path for path, content in updates.items() if path.read_text() != content]
if '--check' in sys.argv:
    if stale:
        raise SystemExit('Stale versions: ' + ', '.join(str(p.relative_to(ROOT)) for p in stale))
    print('Version references match VERSION (' + version + ')')
else:
    for path in stale:
        path.write_text(updates[path])
    print('Synchronized version ' + version)
