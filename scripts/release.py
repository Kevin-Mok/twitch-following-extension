#!/usr/bin/env python3
"""Build and inspect an allowlisted Chrome extension ZIP, without changing source config."""
import argparse
import hashlib
from html.parser import HTMLParser
import io
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import stat
import struct
import sys
from urllib.parse import urlsplit, unquote
import zipfile

ROOT = Path(__file__).resolve().parent.parent
STATIC = {'manifest.json', 'options.html', 'help.html', 'privacy.html', 'public.css', 'LICENSE'}
ICONS = {f'icons/icon{size}.png' for size in (16, 32, 48, 128)}
CLIENT_ID = re.compile(r'[A-Za-z0-9]{3,100}\Z')
CONFIG = re.compile(r"export const TWITCH_CLIENT_ID = '([A-Za-z0-9]{0,100})';\n?\Z")


def allowed(name):
    path = PurePosixPath(name)
    return name in STATIC or name in ICONS or (
        len(path.parts) == 2 and path.parts[0] == 'src'
        and path.suffix in {'.js', '.css'} and re.fullmatch(r'[A-Za-z0-9_.-]+', path.name)
    )


def local_ref(files, owner, ref, external=False):
    parsed = urlsplit(ref)
    if parsed.scheme or parsed.netloc:
        if not external:
            raise ValueError(f'{owner}: dependency must be a packaged local file: {ref}')
        return
    if not parsed.path:
        return
    target = posixpath.normpath(posixpath.join(posixpath.dirname(owner), unquote(parsed.path)))
    if parsed.path.startswith('/') or target.startswith('../') or target not in files:
        raise ValueError(f'{owner}: missing or unsafe local dependency {ref}')


class References(HTMLParser):
    def __init__(self, files, owner):
        super().__init__()
        self.files, self.owner = files, owner

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        for key in ('src', 'href'):
            if key in attrs:
                ref = attrs[key]
                if tag in ('script', 'link') and urlsplit(ref).scheme:
                    raise ValueError(f'{self.owner}: remote code/style reference {ref}')
                local_ref(self.files, self.owner, ref, external=tag not in ('script', 'link'))


def validate(files):
    missing = STATIC - files.keys()
    if missing:
        raise ValueError(f'Missing required files: {", ".join(sorted(missing))}')
    manifest = json.loads(files['manifest.json'])
    if not isinstance(manifest, dict):
        raise ValueError('manifest.json must contain an object')
    if manifest.get('manifest_version') != 3:
        raise ValueError('Expected a Manifest V3 extension')
    version = manifest.get('version', '')
    if not re.fullmatch(r'\d+(?:\.\d+){0,3}', version):
        raise ValueError('Invalid manifest version')
    if not files.get('src/config.js') or not CONFIG.fullmatch(files['src/config.js'].decode()):
        raise ValueError('src/config.js must contain only the public Twitch client ID export')
    config_id = CONFIG.fullmatch(files['src/config.js'].decode())[1]
    if config_id and not CLIENT_ID.fullmatch(config_id):
        raise ValueError('Invalid public Twitch client ID')
    references = []
    background = manifest.get('background', {})
    if background.get('service_worker'):
        references.append(background['service_worker'])
    for action in ('action', 'browser_action'):
        value = manifest.get(action, {})
        if value.get('default_popup'):
            references.append(value['default_popup'])
        icon = value.get('default_icon', {})
        references.extend([icon] if isinstance(icon, str) else icon.values())
    if manifest.get('options_page'):
        references.append(manifest['options_page'])
    if manifest.get('options_ui', {}).get('page'):
        references.append(manifest['options_ui']['page'])
    references.extend(manifest.get('icons', {}).values())
    for entry in manifest.get('content_scripts', []):
        references.extend(entry.get('js', []) + entry.get('css', []))
    for entry in manifest.get('web_accessible_resources', []):
        references.extend(entry.get('resources', []))
    for ref in references:
        local_ref(files, 'manifest.json', ref)
    for name, data in files.items():
        if name.endswith('.html'):
            References(files, name).feed(data.decode())
        elif name.endswith('.js'):
            source = data.decode()
            for ref in re.findall(r'''(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']''', source):
                if not ref.startswith('.'):
                    raise ValueError(f'{name}: module dependency must be local: {ref}')
                local_ref(files, name, ref)
        elif name.endswith('.css'):
            source = data.decode()
            for ref in re.findall(r'''url\(\s*["']?([^\s)"']+)''', source):
                local_ref(files, name, ref)
            for ref in re.findall(r'''@import\s+["']([^"']+)["']''', source):
                local_ref(files, name, ref)
        elif name.endswith('.png'):
            expected = int(re.search(r'icon(\d+)\.png$', name)[1])
            if len(data) < 24 or data[:8] != b'\x89PNG\r\n\x1a\n' or struct.unpack('>II', data[16:24]) != (expected, expected):
                raise ValueError(f'{name}: expected a {expected}x{expected} PNG')
    return manifest, bool(config_id)


def read_archive(data):
    files = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if sum(info.file_size for info in archive.infolist()) > 20_000_000:
            raise ValueError('Archive exceeds 20 MB inspection limit')
        for info in archive.infolist():
            name = info.filename
            if name in files:
                raise ValueError(f'Duplicate archive entry: {name}')
            if stat.S_ISLNK(info.external_attr >> 16):
                raise ValueError(f'Symlink is not allowed: {name}')
            if not allowed(name) or '\\' in name or str(PurePosixPath(name)) != name:
                raise ValueError(f'Unapproved archive entry: {name}')
            files[name] = archive.read(info)
    manifest, configured = validate(files)
    return manifest, configured, files


def package(client_id, output):
    if client_id is not None and not CLIENT_ID.fullmatch(client_id):
        raise ValueError('Public Twitch client ID must be 3-100 alphanumeric characters')
    files = {}
    for name in sorted(STATIC | ICONS | {p.relative_to(ROOT).as_posix() for p in (ROOT / 'src').glob('*') if p.suffix in {'.js', '.css'}}):
        path = ROOT / name
        if not path.exists() and name in ICONS:
            continue
        if path.is_symlink() or not path.resolve().is_relative_to(ROOT):
            raise ValueError(f'Source symlink is not allowed: {name}')
        files[name] = path.read_bytes()
    files['src/config.js'] = f"export const TWITCH_CLIENT_ID = '{client_id or ''}';\n".encode()
    manifest, configured = validate(files)
    name = f'twitch-following-{manifest["version"]}{"" if configured else "-draft"}.zip'
    destination = Path(output) if output else ROOT / 'artifacts' / name
    if not destination.is_absolute():
        destination = ROOT / destination
    destination = destination.resolve()
    if destination.suffix != '.zip':
        raise ValueError('Output must end in .zip')
    if destination.is_relative_to(ROOT) and not destination.is_relative_to(ROOT / 'artifacts'):
        raise ValueError('Output inside this repository must be under artifacts/')
    content = io.BytesIO()
    with zipfile.ZipFile(content, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for entry, data in sorted(files.items()):
            info = zipfile.ZipInfo(entry, (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    data = content.getvalue()
    read_archive(data)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return destination, data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    build = commands.add_parser('package', help='Build an allowlisted draft or configured ZIP')
    build.add_argument('--client-id', help='Public Twitch application client ID (never a client secret)')
    build.add_argument('--out', help='ZIP destination; repository output must be under artifacts/')
    inspect = commands.add_parser('inspect', help='Validate ZIP contents, references, and icon dimensions')
    inspect.add_argument('zip', type=Path)
    for command in (build, inspect):
        command.add_argument('--plain', action='store_true', help='ASCII output without decorative glyphs')
    args = parser.parse_args()
    def say(message, emoji='✓'):
        print(f'{message}' if args.plain else f'{emoji} {message}', flush=True)
    try:
        if args.command == 'package':
            say('Preparing extension package…' if not args.plain else 'Preparing extension package...', '📦')
            path, data = package(args.client_id, args.out)
        else:
            path = args.zip.resolve()
            say('Inspecting extension package...', '🔎')
            data = path.read_bytes()
        manifest, configured, files = read_archive(data)
        state = 'CONFIGURED (public client ID included; OAuth/runtime verification still required)' if configured else 'DRAFT (no Twitch client ID; not ready for submission)'
        say(f'{manifest["name"]} {manifest["version"]}: {state}', '📋')
        say(f'Validated {len(files)} allowlisted files and local dependencies')
        say(f'ZIP: {path}', '📁')
        say(f'Size: {len(data):,} bytes', '📏')
        say(f'SHA256: {hashlib.sha256(data).hexdigest()}', '🔐')
        return 0
    except (OSError, ValueError, KeyError, TypeError, UnicodeError, zipfile.BadZipFile, RuntimeError) as error:
        prefix = 'Error:' if args.plain else '❌ Error:'
        print(f'{prefix} {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
