#!/usr/bin/env python3
"""Dependency-free repository checks. This does not replace browser testing."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]

def run(*args):
    subprocess.run(args, cwd=ROOT, check=True)

run(sys.executable, 'scripts/sync-version.py', '--check')
for test in sorted(ROOT.glob('tests/*.test.js')) + sorted(ROOT.glob('extension/tests/*.test.js')):
    run('node', str(test))
for script in sorted(ROOT.glob('*.js')) + sorted(ROOT.glob('extension/*.js')):
    run('node', '--check', str(script))

class LocalAssets(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.source = source

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        asset = attrs.get('src') if tag == 'script' else None
        if tag == 'link' and attrs.get('rel') in ('stylesheet', 'preconnect', 'preload'):
            asset = attrs.get('href')
        if not asset:
            return
        parsed = urlsplit(asset)
        if parsed.scheme or parsed.netloc:
            raise AssertionError(f'{self.source}: runtime script/font/stylesheet must be bundled: {asset}')
        if not (self.source.parent / parsed.path).is_file():
            raise AssertionError(f'{self.source}: missing asset: {asset}')

for html in (ROOT / 'index.html', ROOT / 'extension/popup.html'):
    LocalAssets(html).feed(html.read_text())
font = ROOT / 'assets/fonts/InterVariable.woff2'
assert font.read_bytes()[:4] == b'wOF2', 'Bundled font must be WOFF2'
assert (font.parent / 'OFL.txt').is_file(), 'Keep the font license'
print('All automated checks passed; manual/browser acceptance is still required.')
