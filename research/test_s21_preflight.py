import importlib.util
import pathlib
import unittest
import urllib.error
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('preflight', pathlib.Path(__file__).with_name('s21-preflight.py'))
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)


class PreflightTests(unittest.TestCase):
    def test_memory_only_reports_allowed_aggregates(self):
        result = preflight.memory_summary('MemTotal: 8388608 kB\nMemAvailable: 2097152 kB\nSerial: 1234 kB\n')
        self.assertEqual(result, {'MemTotal': 8192.0, 'MemAvailable': 2048.0})

    def test_non_hardware_properties_denied(self):
        with self.assertRaises(ValueError):
            preflight.property_value('ro.serialno')

    def test_offline_mode_never_calls_network(self):
        with patch.object(preflight, 'property_value', return_value=None), patch.object(preflight, 'check_api') as api:
            result = preflight.collect()
            api.assert_not_called()
            self.assertFalse(result['android_detected'])
            self.assertFalse(result['inference_tested'])
            self.assertEqual(result['production_writes'], 0)

    def test_redirect_refused(self):
        req = preflight.urllib.request.Request(preflight.API_HEALTH)
        with self.assertRaises(urllib.error.HTTPError):
            preflight.NoRedirect().redirect_request(req, None, 302, '', {}, 'https://other.example/')

    def test_network_failure_is_sanitized(self):
        with patch.object(preflight.urllib.request, 'build_opener') as factory:
            factory.return_value.open.side_effect = OSError('private details')
            self.assertEqual(preflight.check_api(), {'ok': False, 'reason': 'network_tls_or_json_error'})


if __name__ == '__main__':
    unittest.main()
