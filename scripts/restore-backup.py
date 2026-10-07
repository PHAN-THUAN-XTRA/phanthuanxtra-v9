"""Join and verify the Telegram backup without any production credentials."""
import hashlib,json,tarfile
from pathlib import Path
root=Path(__file__).resolve().parent
manifest=json.loads((root/'backup-parts.json').read_text())
output=root/'full-system-backup.tar.gz'
with output.open('wb') as target:
    for part in manifest['parts']:
        name=part['name']
        if Path(name).name!=name: raise ValueError('Invalid part path')
        data=(root/name).read_bytes()
        if len(data)!=part['bytes'] or hashlib.sha256(data).hexdigest()!=part['sha256']: raise ValueError('Part checksum failed: '+name)
        target.write(data)
if output.stat().st_size!=manifest['bytes'] or hashlib.sha256(output.read_bytes()).hexdigest()!=manifest['sha256']: raise ValueError('Archive checksum failed')
with tarfile.open(output,'r:gz') as archive:
    archive.extractall(root/'restored-backup',filter='data')
print('Backup parts and archive SHA-256 verified; extracted to restored-backup.')
