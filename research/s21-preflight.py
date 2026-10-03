#!/usr/bin/env python3
"""Read-only S21/Termux capability report; no secrets, installs or uploads."""
import argparse
import datetime
import json
import os
import platform
import shutil
import subprocess
import urllib.error
import urllib.request
from pathlib import Path

API_HEALTH = 'https://phanthuanxtra.com/api/app/v1/health'
PROPERTIES = ('ro.product.model', 'ro.soc.model', 'ro.board.platform',
              'ro.product.cpu.abi', 'ro.build.version.release', 'ro.build.version.sdk')


def property_value(name):
    if name not in PROPERTIES:
        raise ValueError('Property outside hardware allowlist')
    if not shutil.which('getprop'):
        return None
    try:
        value = subprocess.run(['getprop', name], capture_output=True, text=True,
                               timeout=2, check=True).stdout.strip()
        return value[:120] or None
    except (OSError, subprocess.SubprocessError):
        return None


def memory_summary(text):
    result = {}
    for line in text.splitlines():
        fields = line.split()
        if len(fields) >= 3 and fields[0] in ('MemTotal:', 'MemAvailable:'):
            if fields[1].isdigit() and fields[2] == 'kB':
                result[fields[0][:-1]] = round(int(fields[1]) / 1024, 1)
    return result


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, 'Redirect refused', headers, fp)


def check_api():
    request = urllib.request.Request(API_HEALTH, headers={'Accept': 'application/json'})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    try:
        with opener.open(request, timeout=10) as response:
            raw = response.read(65537)
            if len(raw) > 65536:
                return {'ok': False, 'reason': 'response_too_large'}
            data = json.loads(raw)
            return {'ok': response.status == 200 and data.get('ok') is True
                    and data.get('service') == 'app-api', 'http': response.status}
    except urllib.error.HTTPError as error:
        return {'ok': False, 'http': error.code, 'reason': 'http_or_redirect_error'}
    except (OSError, ValueError, TypeError, AttributeError):
        return {'ok': False, 'reason': 'network_tls_or_json_error'}


def collect(check_network=False):
    props = {key: property_value(key) for key in PROPERTIES}
    try:
        memory = memory_summary(Path('/proc/meminfo').read_text())
    except OSError:
        memory = {}
    try:
        free = round(shutil.disk_usage(Path.home()).free / (1024 ** 3), 2)
    except OSError:
        free = None
    return {
        'schema': 'ptx-s21-preflight/1',
        'time_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'android_detected': bool(props['ro.build.version.sdk']),
        'termux_detected': bool(os.environ.get('TERMUX_VERSION')),
        'properties': props,
        'machine': platform.machine(),
        'cpu_count': os.cpu_count(),
        'memory_mib': memory,
        'home_storage_free_gib': free,
        'python': platform.python_version(),
        'tools_present': {name: bool(shutil.which(name))
                          for name in ('git', 'cmake', 'clang', 'llama-cli')},
        'api': check_api() if check_network else {'checked': False},
        'scope': 'hardware summary and optional public health GET only',
        'inference_tested': False,
        'authenticated_connection_tested': False,
        'production_writes': 0,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-api', action='store_true', help='GET canonical public App API health')
    args = parser.parse_args()
    print(json.dumps(collect(args.check_api), ensure_ascii=False, indent=2))
