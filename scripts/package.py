#!/usr/bin/env python3
"""Prepare release ZIPs/checksums. Publish only artifacts produced by tagged CI."""
import hashlib
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / 'VERSION').read_text().strip()
out = ROOT / 'dist'
out.mkdir(exist_ok=True)
for stale in out.iterdir():
    if stale.is_file():
        stale.unlink()
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
assets = []
for label, prefix in [('Website', ''), ('Chrome', 'extension/')]:
    archive = out / f'Gitbrag-{version}-{label}.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for relative in sorted(filter(None, tracked)):
            path = ROOT / relative
            if not path.is_file():
                continue
            if prefix:
                if not relative.startswith(prefix) or relative.startswith('extension/tests/'):
                    continue
                archive_name = relative[len(prefix):]
            else:
                if relative.startswith(('.github/', 'extension/', 'tests/', 'scripts/')) or relative in ('AGENTS.md', '.gitignore'):
                    continue
                archive_name = relative
            bundle.write(path, archive_name)
        if prefix and (ROOT / 'LICENSE').is_file():
            bundle.write(ROOT / 'LICENSE', 'LICENSE')
    assets.append(archive)
(out / 'SHA256SUMS.txt').write_text(''.join(
    f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n' for path in assets
))
print('Created website/extension ZIPs and SHA256SUMS.txt in dist/.')
