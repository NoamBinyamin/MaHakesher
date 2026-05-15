#!/usr/bin/env python3
"""
Vanilla Python HTTP Server for Two-Way Radio Manager
Uses only built-in modules: http.server, json, urllib, mimetypes, os, uuid
"""

import http.server
import json
import os
import uuid
import mimetypes
from urllib.parse import urlparse, parse_qs
from datetime import datetime

# ==================== Configuration ====================

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(_BASE_DIR, 'data.json')
MAPPING_FILE = os.path.join(_BASE_DIR, 'mapping.json')
AUDIT_LOG_FILE = os.path.join(_BASE_DIR, 'audit.log')
HOST = '0.0.0.0'
PORT = int(os.environ.get('PORT', 8000))
FRONTEND_DIR = os.path.join(_BASE_DIR, 'frontend')


# ==================== Utility Functions ====================

def migrate_config(data):
    """Add IDs to owners and convert radio_types from dict to array. Returns True if changed."""
    changed = False
    config = data.get('config', {})

    for owner in config.get('owners', []):
        if 'id' not in owner:
            owner['id'] = generate_id('owner')
            changed = True

    radio_types = config.get('radio_types', {})
    if isinstance(radio_types, dict):
        config['radio_types'] = [
            {'id': generate_id('device'), 'name': k, 'band': v}
            for k, v in radio_types.items()
        ]
        changed = True
    else:
        for device in config.get('radio_types', []):
            if 'id' not in device:
                device['id'] = generate_id('device')
                changed = True

    return changed

def _radio_types_lookup(config):
    """Return a {name: band} dict from config.radio_types regardless of format."""
    rt = config.get('radio_types', [])
    if isinstance(rt, list):
        return {d['name']: d['band'] for d in rt}
    return rt

def _make_default_data():
    """Return the canonical default data structure for a fresh installation."""
    return {
        "config": {
            "frequency_bands": {
                "UHF":  {"min": 255.0, "max": 395.5},
                "HVHF": {"min": 120.0, "max": 140.0},
                "LVHF": {"min": 33.0,  "max": 95.0},
            },
            "radio_types": [],
            "missions": [],
            "owners": []
        },
        "data": {
            "sectors": [],
            "sites": [],
            "radios": [],
            "planned_missions": [],
            "archived_missions": []
        }
    }

def load_data():
    """Load data from JSON file"""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if migrate_config(data):
            save_data(data)
        return data
    except FileNotFoundError:
        data = _make_default_data()
        save_data(data)
        return data

def save_data(data):
    """Save data to JSON file"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def load_mapping():
    """Load mapping data from JSON file"""
    try:
        with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"mappings": []}

def save_mapping(data):
    """Save mapping data to JSON file"""
    with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def get_frequency_band_for_device(device_type):
    """Get the frequency band for a given device type"""
    data = load_data()
    return _radio_types_lookup(data.get('config', {})).get(device_type)

def generate_id(prefix):
    """Generate a unique ID"""
    return f"{prefix}-{str(uuid.uuid4())[:8]}"

def audit_log(action, entity_type, entity_id=None, details=None):
    """Append an entry to the audit log (JSON-lines format)"""
    entry = {
        'timestamp': datetime.now().isoformat(),
        'action': action,
        'entity_type': entity_type,
    }
    if entity_id:
        entry['entity_id'] = entity_id
    if details:
        entry['details'] = details
    try:
        with open(AUDIT_LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
    except Exception as e:
        print(f"[AUDIT LOG ERROR] {e}")

# ==================== HTTP Request Handler ====================

class RadioManagerHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler for the radio manager"""

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # API endpoints
        if path == '/api/config':
            return self.handle_config()
        elif path == '/api/sectors':
            return self.handle_get_sectors()
        elif path == '/api/sites':
            return self.handle_get_sites()
        elif path == '/api/radios':
            return self.handle_get_radios()
        elif path == '/api/planned_missions':
            return self.handle_get_planned_missions()
        elif path == '/api/archived_missions':
            return self.handle_get_archived_missions()
        elif path == '/api/hierarchy':
            return self.handle_hierarchy()
        elif path == '/api/links':
            return self.handle_get_links()
        elif path == '/api/export':
            return self.handle_export()
        elif path == '/api/audit':
            return self.handle_get_audit(parsed_path)
        elif path.startswith('/api/'):
            return self.send_json_response(404, {'error': 'Endpoint not found'})

        # Serve static files
        return self.serve_static_file(path)

    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            post_data = json.loads(body.decode('utf-8')) if body else {}
        except json.JSONDecodeError:
            return self.send_json_response(400, {'error': 'Invalid JSON'})

        # API endpoints
        if path == '/api/config/owners':
            return self.handle_create_owner(post_data)
        elif path.startswith('/api/config/owners/'):
            owner_id = path.split('/')[-1]
            return self.handle_update_owner(owner_id, post_data)
        elif path == '/api/config/devices':
            return self.handle_create_device(post_data)
        elif path.startswith('/api/config/devices/'):
            device_id = path.split('/')[-1]
            return self.handle_update_device(device_id, post_data)
        elif path == '/api/sectors':
            return self.handle_create_sector(post_data)
        elif path == '/api/sites':
            return self.handle_create_site(post_data)
        elif path == '/api/radios':
            return self.handle_create_radio(post_data)
        elif path == '/api/planned_missions':
            return self.handle_create_planned_mission(post_data)
        elif path == '/api/links':
            return self.handle_create_link(post_data)
        elif path == '/api/import':
            return self.handle_import(post_data)
        elif path == '/api/batch/clear_site':
            return self.handle_batch_clear_site(post_data)
        elif path.startswith('/api/sectors/'):
            sector_id = path.split('/')[-1]
            return self.handle_update_sector(sector_id, post_data)
        elif path.startswith('/api/sites/'):
            site_id = path.split('/')[-1]
            return self.handle_update_site(site_id, post_data)
        elif path.startswith('/api/radios/'):
            radio_id = path.split('/')[-1]
            return self.handle_update_radio(radio_id, post_data)
        elif path.startswith('/api/planned_missions/'):
            parts = path.split('/')
            mission_id = parts[3]
            if len(parts) == 5 and parts[4] == 'archive':
                return self.handle_archive_mission(mission_id)
            elif len(parts) == 5 and parts[4] == 'start':
                return self.handle_start_mission(mission_id)
            elif len(parts) == 5 and parts[4] == 'end':
                return self.handle_end_mission(mission_id, post_data)
            else:
                return self.handle_update_planned_mission(mission_id, post_data)
        elif path.startswith('/api/archived_missions/'):
            parts = path.split('/')
            mission_id = parts[3]
            if len(parts) == 4:
                # /api/archived_missions/<id> - delete
                return self.handle_delete_archived_mission(mission_id)
            elif len(parts) == 5 and parts[4] == 'restore':
                return self.handle_restore_archived_mission(mission_id)
            elif len(parts) == 5 and parts[4] == 'archive':
                return self.handle_archive_archived_mission(mission_id)
            else:
                return self.send_json_response(404, {'error': 'Not found'})
        elif path.startswith('/api/links/'):
            link_id = path.split('/')[-1]
            return self.handle_update_link(link_id, post_data)
        else:
            return self.send_json_response(404, {'error': 'Endpoint not found'})

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(204)
        self.end_headers()

    def do_DELETE(self):
        """Handle DELETE requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/api/config/owners/'):
            owner_id = path.split('/')[-1]
            return self.handle_delete_owner(owner_id)
        elif path.startswith('/api/config/devices/'):
            device_id = path.split('/')[-1]
            return self.handle_delete_device(device_id)
        elif path.startswith('/api/sectors/'):
            sector_id = path.split('/')[-1]
            return self.handle_delete_sector(sector_id)
        elif path.startswith('/api/sites/'):
            site_id = path.split('/')[-1]
            return self.handle_delete_site(site_id)
        elif path.startswith('/api/radios/'):
            radio_id = path.split('/')[-1]
            return self.handle_delete_radio(radio_id)
        elif path.startswith('/api/planned_missions/'):
            mission_id = path.split('/')[-1]
            return self.handle_delete_planned_mission(mission_id)
        elif path.startswith('/api/archived_missions/'):
            mission_id = path.split('/')[-1]
            return self.handle_delete_archived_mission(mission_id)
        elif path.startswith('/api/links/'):
            link_id = path.split('/')[-1]
            return self.handle_delete_link(link_id)
        else:
            return self.send_json_response(404, {'error': 'Endpoint not found'})

    # ==================== API Handlers ====================

    def handle_config(self):
        """GET /api/config"""
        data = load_data()
        config = data.get('config', {})
        return self.send_json_response(200, config)

    def handle_get_sectors(self):
        """GET /api/sectors"""
        data = load_data()
        sectors = data.get('data', {}).get('sectors', [])
        return self.send_json_response(200, sectors)

    def handle_get_sites(self):
        """GET /api/sites"""
        data = load_data()
        sites = data.get('data', {}).get('sites', [])
        return self.send_json_response(200, sites)

    def handle_get_radios(self):
        """GET /api/radios"""
        data = load_data()
        radios = data.get('data', {}).get('radios', [])
        rt_lookup = _radio_types_lookup(data.get('config', {}))

        for radio in radios:
            radio['frequency_band'] = rt_lookup.get(radio.get('device_type', ''))

        return self.send_json_response(200, radios)

    def handle_hierarchy(self):
        """GET /api/hierarchy - Return nested hierarchy"""
        data = load_data()
        sectors = data.get('data', {}).get('sectors', [])
        sites = data.get('data', {}).get('sites', [])
        radios = data.get('data', {}).get('radios', [])
        config = data.get('config', {})

        rt_lookup = _radio_types_lookup(config)
        hierarchy = []
        for sector in sectors:
            sector_data = {
                'id': sector['id'],
                'name': sector['name'],
                'type': 'sector',
                'sites': []
            }

            sector_sites = [s for s in sites if s['sector_id'] == sector['id']]
            for site in sector_sites:
                site_data = {
                    'id': site['id'],
                    'name': site['name'],
                    'type': 'site',
                    'coordinates_utm': site['coordinates_utm'],
                    'site_type': site['site_type'],
                    'radios': []
                }

                site_radios = [r for r in radios if r['site_id'] == site['id']]
                for radio in site_radios:
                    device_type = radio['device_type']
                    frequency_band = rt_lookup.get(device_type)

                    radio_data = {
                        'id': radio.get('id'),
                        'device_type': device_type,
                        'frequency_band': frequency_band,
                        'frequency': radio.get('frequency', 0.0),
                        'mission_name': radio.get('mission_name', 'Routine'),
                        'owner': radio.get('owner', 'Unknown'),
                        'role': radio.get('role'),
                        'standby_frequency': radio.get('standby_frequency'),
                        'standby_owner': radio.get('standby_owner'),
                        'standby_role': radio.get('standby_role'),
                        'standby_mission': radio.get('standby_mission'),
                        'status': radio.get('status', 'Usable'),
                        'notes': radio.get('notes', ''),
                        'type': 'radio'
                    }
                    site_data['radios'].append(radio_data)

                sector_data['sites'].append(site_data)

            hierarchy.append(sector_data)

        return self.send_json_response(200, hierarchy)

    # ==================== Config: Owners ====================

    def handle_create_owner(self, post_data):
        """POST /api/config/owners"""
        name = (post_data.get('name') or '').strip()
        light = post_data.get('light', '#E5E7EB')
        dark = post_data.get('dark', '#334155')
        if not name:
            return self.send_json_response(400, {'error': 'Name is required'})
        data = load_data()
        owners = data['config'].get('owners', [])
        if any(o['name'] == name for o in owners):
            return self.send_json_response(400, {'error': f'Owner "{name}" already exists'})
        new_owner = {'id': generate_id('owner'), 'name': name, 'light': light, 'dark': dark}
        owners.append(new_owner)
        data['config']['owners'] = owners
        save_data(data)
        audit_log('create', 'owner', new_owner['id'], {'name': name})
        return self.send_json_response(201, new_owner)

    def handle_update_owner(self, owner_id, post_data):
        """POST /api/config/owners/<id>"""
        data = load_data()
        owners = data['config'].get('owners', [])
        owner = next((o for o in owners if o.get('id') == owner_id), None)
        if not owner:
            return self.send_json_response(404, {'error': 'Owner not found'})
        new_name = (post_data.get('name') or '').strip()
        light = post_data.get('light', owner.get('light'))
        dark = post_data.get('dark', owner.get('dark'))
        if not new_name:
            return self.send_json_response(400, {'error': 'Name is required'})
        old_name = owner['name']
        if new_name != old_name and any(o['name'] == new_name and o.get('id') != owner_id for o in owners):
            return self.send_json_response(400, {'error': f'Owner "{new_name}" already exists'})
        owner['name'] = new_name
        owner['light'] = light
        owner['dark'] = dark
        if new_name != old_name:
            for r in data['data'].get('radios', []):
                if r.get('owner') == old_name:
                    r['owner'] = new_name
                if r.get('standby_owner') == old_name:
                    r['standby_owner'] = new_name
            for m in data['data'].get('planned_missions', []):
                if m.get('owner') == old_name:
                    m['owner'] = new_name
            for m in data['data'].get('archived_missions', []):
                if m.get('owner') == old_name:
                    m['owner'] = new_name
        save_data(data)
        if new_name != old_name:
            mapping = load_mapping()
            for link in mapping.get('mappings', []):
                if link.get('owner') == old_name:
                    link['owner'] = new_name
            save_mapping(mapping)
        audit_log('update', 'owner', owner_id, {'old_name': old_name, 'new_name': new_name})
        return self.send_json_response(200, owner)

    def handle_delete_owner(self, owner_id):
        """DELETE /api/config/owners/<id>"""
        data = load_data()
        owners = data['config'].get('owners', [])
        owner = next((o for o in owners if o.get('id') == owner_id), None)
        if not owner:
            return self.send_json_response(404, {'error': 'Owner not found'})
        owner_name = owner['name']
        radio_count = sum(
            1 for r in data['data'].get('radios', [])
            if r.get('owner') == owner_name or r.get('standby_owner') == owner_name
        )
        mission_count = sum(1 for m in data['data'].get('planned_missions', []) if m.get('owner') == owner_name)
        archived_count = sum(1 for m in data['data'].get('archived_missions', []) if m.get('owner') == owner_name)
        mapping = load_mapping()
        link_count = sum(1 for l in mapping.get('mappings', []) if l.get('owner') == owner_name)
        total = radio_count + mission_count + archived_count + link_count
        if total > 0:
            parts = []
            if radio_count:   parts.append(f'{radio_count} radio(s)')
            if mission_count: parts.append(f'{mission_count} planned mission(s)')
            if archived_count: parts.append(f'{archived_count} archived mission(s)')
            if link_count:    parts.append(f'{link_count} link(s)')
            return self.send_json_response(409, {
                'error': f'Cannot delete — owner is assigned to {", ".join(parts)}',
                'radio_count': radio_count, 'mission_count': mission_count,
                'archived_count': archived_count, 'link_count': link_count,
            })
        data['config']['owners'] = [o for o in owners if o.get('id') != owner_id]
        save_data(data)
        audit_log('delete', 'owner', owner_id, {'name': owner_name})
        return self.send_json_response(200, {'message': 'Deleted'})

    # ==================== Config: Devices ====================

    def handle_create_device(self, post_data):
        """POST /api/config/devices"""
        name = (post_data.get('name') or '').strip()
        band = (post_data.get('band') or '').strip()
        if not name:
            return self.send_json_response(400, {'error': 'Name is required'})
        if not band:
            return self.send_json_response(400, {'error': 'Band is required'})
        data = load_data()
        valid_bands = list(data['config'].get('frequency_bands', {}).keys())
        if band not in valid_bands:
            return self.send_json_response(400, {'error': f'Band must be one of: {", ".join(valid_bands)}'})
        devices = data['config'].get('radio_types', [])
        if any(d['name'] == name for d in devices):
            return self.send_json_response(400, {'error': f'Device "{name}" already exists'})
        new_device = {'id': generate_id('device'), 'name': name, 'band': band}
        devices.append(new_device)
        data['config']['radio_types'] = devices
        save_data(data)
        audit_log('create', 'device', new_device['id'], {'name': name, 'band': band})
        return self.send_json_response(201, new_device)

    def handle_update_device(self, device_id, post_data):
        """POST /api/config/devices/<id>"""
        data = load_data()
        devices = data['config'].get('radio_types', [])
        device = next((d for d in devices if d.get('id') == device_id), None)
        if not device:
            return self.send_json_response(404, {'error': 'Device not found'})
        new_name = (post_data.get('name') or '').strip()
        new_band = (post_data.get('band') or '').strip()
        if not new_name:
            return self.send_json_response(400, {'error': 'Name is required'})
        if not new_band:
            return self.send_json_response(400, {'error': 'Band is required'})
        valid_bands = list(data['config'].get('frequency_bands', {}).keys())
        if new_band not in valid_bands:
            return self.send_json_response(400, {'error': f'Band must be one of: {", ".join(valid_bands)}'})
        old_name = device['name']
        old_band = device['band']
        if new_name != old_name and any(d['name'] == new_name and d.get('id') != device_id for d in devices):
            return self.send_json_response(400, {'error': f'Device "{new_name}" already exists'})
        if new_band != old_band:
            blocking = [
                r for r in data['data'].get('radios', [])
                if r.get('device_type') == old_name and any([
                    r.get('frequency'), r.get('owner'), r.get('mission_name'), r.get('role'),
                    r.get('standby_frequency'), r.get('standby_owner'), r.get('standby_mission'), r.get('standby_role'),
                ])
            ]
            if blocking:
                return self.send_json_response(409, {
                    'error': f'Cannot change band — {len(blocking)} {old_name} radio(s) have active assignments. Clear them first.',
                    'blocking_count': len(blocking),
                })
        device['name'] = new_name
        device['band'] = new_band
        if new_name != old_name:
            for r in data['data'].get('radios', []):
                if r.get('device_type') == old_name:
                    r['device_type'] = new_name
        save_data(data)
        audit_log('update', 'device', device_id, {'old_name': old_name, 'new_name': new_name, 'old_band': old_band, 'new_band': new_band})
        return self.send_json_response(200, device)

    def handle_delete_device(self, device_id):
        """DELETE /api/config/devices/<id>"""
        data = load_data()
        devices = data['config'].get('radio_types', [])
        device = next((d for d in devices if d.get('id') == device_id), None)
        if not device:
            return self.send_json_response(404, {'error': 'Device not found'})
        device_name = device['name']
        radio_count = sum(1 for r in data['data'].get('radios', []) if r.get('device_type') == device_name)
        if radio_count > 0:
            return self.send_json_response(409, {
                'error': f'Cannot delete "{device_name}" — {radio_count} radio(s) are using it',
                'radio_count': radio_count,
            })
        data['config']['radio_types'] = [d for d in devices if d.get('id') != device_id]
        save_data(data)
        audit_log('delete', 'device', device_id, {'name': device_name})
        return self.send_json_response(200, {'message': 'Deleted'})

    def handle_create_sector(self, post_data):
        """POST /api/sectors"""
        data = load_data()
        new_sector = {
            'id': generate_id('sector'),
            'name': post_data.get('name', '')
        }
        data['data']['sectors'].append(new_sector)
        save_data(data)
        audit_log('create', 'sector', new_sector['id'], {'name': new_sector['name']})
        return self.send_json_response(201, new_sector)

    def handle_create_site(self, post_data):
        """POST /api/sites"""
        data = load_data()
        new_site = {
            'id': generate_id('site'),
            'sector_id': post_data.get('sector_id', ''),
            'name': post_data.get('name', ''),
            'coordinates_utm': post_data.get('coordinates_utm', ''),
            'site_type': post_data.get('site_type', 'Fixed')
        }
        data['data']['sites'].append(new_site)
        save_data(data)
        audit_log('create', 'site', new_site['id'], {'name': new_site['name']})
        return self.send_json_response(201, new_site)

    def handle_create_radio(self, post_data):
        """POST /api/radios"""
        data = load_data()
        raw_freq = post_data.get('frequency')
        try:
            frequency = float(raw_freq) if raw_freq is not None else None
        except (ValueError, TypeError):
            return self.send_json_response(400, {'error': 'Invalid frequency format'})

        # Handle standby frequency
        standby_freq = post_data.get('standby_frequency')
        try:
            standby_frequency = float(standby_freq) if standby_freq is not None else None
        except (ValueError, TypeError):
            standby_frequency = None

        new_radio = {
            'id': generate_id('radio'),
            'site_id': post_data.get('site_id', ''),
            'device_type': post_data.get('device_type', ''),
            'frequency': frequency,
            'owner': post_data.get('owner', ''),
            'mission_name': post_data.get('mission_name', ''),
            'role': post_data.get('role'),
            'standby_frequency': standby_frequency,
            'standby_owner': post_data.get('standby_owner'),
            'standby_role': post_data.get('standby_role'),
            'standby_mission': post_data.get('standby_mission'),
            'status': post_data.get('status', 'Usable'),
            'notes': post_data.get('notes', '')
        }
        data['data']['radios'].append(new_radio)
        save_data(data)
        audit_log('create', 'radio', new_radio['id'], {'device_type': new_radio['device_type'], 'site_id': new_radio['site_id']})
        return self.send_json_response(201, new_radio)

    def handle_update_sector(self, sector_id, post_data):
        """POST /api/sectors/<id>"""
        data = load_data()
        post_data.pop('id', None)
        for sector in data['data']['sectors']:
            if sector['id'] == sector_id:
                before = {k: sector.get(k) for k in ('name',)}
                sector.update(post_data)
                save_data(data)
                after = {k: sector.get(k) for k in ('name',)}
                changed = [k for k in before if before[k] != after[k]]
                audit_log('update', 'sector', sector_id, {
                    'before': {k: before[k] for k in changed},
                    'after':  {k: after[k]  for k in changed},
                })
                return self.send_json_response(200, sector)
        return self.send_json_response(404, {'error': 'Sector not found'})

    def handle_update_site(self, site_id, post_data):
        """POST /api/sites/<id>"""
        data = load_data()
        post_data.pop('id', None)
        for site in data['data']['sites']:
            if site['id'] == site_id:
                before = {k: site.get(k) for k in ('name', 'coordinates_utm', 'site_type')}
                site.update(post_data)
                save_data(data)
                after = {k: site.get(k) for k in ('name', 'coordinates_utm', 'site_type')}
                changed = [k for k in before if before[k] != after[k]]
                audit_log('update', 'site', site_id, {
                    'before': {k: before[k] for k in changed},
                    'after':  {k: after[k]  for k in changed},
                })
                return self.send_json_response(200, site)
        return self.send_json_response(404, {'error': 'Site not found'})

    def handle_update_radio(self, radio_id, post_data):
        """POST /api/radios/<id>"""
        data = load_data()
        for radio in data['data']['radios']:
            if radio['id'] == radio_id:
                # Handle frequency conversion
                if 'frequency' in post_data:
                    raw_freq = post_data.get('frequency')
                    try:
                        # Keep None as None instead of converting to 0.0
                        post_data['frequency'] = float(raw_freq) if raw_freq is not None else None
                    except (ValueError, TypeError):
                        return self.send_json_response(400, {'error': 'Invalid frequency format'})

                # Handle standby frequency conversion
                if 'standby_frequency' in post_data:
                    standby_freq = post_data.get('standby_frequency')
                    try:
                        post_data['standby_frequency'] = float(standby_freq) if standby_freq is not None else None
                    except (ValueError, TypeError):
                        post_data['standby_frequency'] = None

                _tracked = ('frequency', 'owner', 'mission_name', 'role', 'status',
                            'standby_frequency', 'standby_owner', 'standby_mission', 'standby_role')
                before = {k: radio.get(k) for k in _tracked}
                post_data.pop('id', None)
                radio.update(post_data)
                save_data(data)
                after = {k: radio.get(k) for k in _tracked}
                changed = [k for k in _tracked if before[k] != after[k]]
                audit_log('update', 'radio', radio_id, {
                    'before': {k: before[k] for k in changed},
                    'after':  {k: after[k]  for k in changed},
                })
                return self.send_json_response(200, radio)
        return self.send_json_response(404, {'error': 'Radio not found'})

    def handle_delete_sector(self, sector_id):
        """DELETE /api/sectors/<id>"""
        data = load_data()
        # Find sites in the sector to be deleted
        sites_in_sector = [s['id'] for s in data['data']['sites'] if s.get('sector_id') == sector_id]

        # Filter out radios belonging to those sites
        data['data']['radios'] = [r for r in data['data']['radios'] if r.get('site_id') not in sites_in_sector]

        # Filter out the sites
        data['data']['sites'] = [s for s in data['data']['sites'] if s.get('sector_id') != sector_id]

        # Filter out the sector
        data['data']['sectors'] = [s for s in data['data']['sectors'] if s['id'] != sector_id]
        save_data(data)
        audit_log('delete', 'sector', sector_id, {'cascaded_sites': sites_in_sector})
        return self.send_json_response(200, {'message': 'Deleted'})

    def handle_delete_site(self, site_id):
        """DELETE /api/sites/<id>"""
        data = load_data()
        # Filter out radios belonging to the site
        data['data']['radios'] = [r for r in data['data']['radios'] if r.get('site_id') != site_id]

        # Filter out the site
        data['data']['sites'] = [s for s in data['data']['sites'] if s['id'] != site_id]
        save_data(data)
        audit_log('delete', 'site', site_id)
        return self.send_json_response(200, {'message': 'Deleted'})

    def handle_delete_radio(self, radio_id):
        """DELETE /api/radios/<id>"""
        data = load_data()
        data['data']['radios'] = [r for r in data['data']['radios'] if r['id'] != radio_id]
        save_data(data)
        audit_log('delete', 'radio', radio_id)
        return self.send_json_response(200, {'message': 'Deleted'})

    def handle_get_planned_missions(self):
        """GET /api/planned_missions"""
        data = load_data()
        missions = data.get('data', {}).get('planned_missions', [])
        return self.send_json_response(200, missions)

    def handle_get_archived_missions(self):
        """GET /api/archived_missions"""
        data = load_data()
        missions = data.get('data', {}).get('archived_missions', [])
        return self.send_json_response(200, missions)

    def handle_create_planned_mission(self, post_data):
        """POST /api/planned_missions"""
        data = load_data()
        if 'planned_missions' not in data['data']:
            data['data']['planned_missions'] = []
        new_mission = {
            'id': generate_id('mission'),
            'name': post_data.get('name', ''),
            'owner': post_data.get('owner', ''),
            'status': post_data.get('status', 'Planned'),
            'requirements': post_data.get('requirements', []),
            'created_at': datetime.now().isoformat(),
            'time_start': post_data.get('time_start') or None,
            'time_end': post_data.get('time_end') or None,
        }
        data['data']['planned_missions'].append(new_mission)
        audit_log('create', 'mission', new_mission['id'], {'name': new_mission['name'], 'owner': new_mission['owner']})

        # Add the mission name to config.missions so it can be selected for devices
        mission_name = new_mission['name']
        if mission_name:
            if 'config' not in data:
                data['config'] = {}
            if 'missions' not in data['config']:
                data['config']['missions'] = []
            if mission_name not in data['config']['missions']:
                data['config']['missions'].append(mission_name)

        save_data(data)
        return self.send_json_response(201, new_mission)
        
    def handle_update_planned_mission(self, mission_id, post_data):
        """POST /api/planned_missions/<id>"""
        data = load_data()
        post_data.pop('id', None)
        post_data.pop('created_at', None)  # creation timestamp is immutable
        for mission in data.get('data', {}).get('planned_missions', []):
            if mission['id'] == mission_id:
                old_name = mission.get('name')
                new_name = post_data.get('name')
                before_m = {k: mission.get(k) for k in ('name', 'owner')}

                mission.update(post_data)
                
                if old_name and new_name and old_name != new_name:
                    if 'config' in data and 'missions' in data['config']:
                        try:
                            idx = data['config']['missions'].index(old_name)
                            data['config']['missions'][idx] = new_name
                        except ValueError:
                            if new_name not in data['config']['missions']:
                                data['config']['missions'].append(new_name)
                    
                    for r in data.get('data', {}).get('radios', []):
                        if r.get('mission_name') == old_name:
                            r['mission_name'] = new_name
                        if r.get('standby_mission') == old_name:
                            r['standby_mission'] = new_name

                save_data(data)
                after_m = {k: mission.get(k) for k in ('name', 'owner')}
                changed_m = [k for k in before_m if before_m[k] != after_m[k]]
                audit_log('update', 'mission', mission_id, {
                    'before': {k: before_m[k] for k in changed_m},
                    'after':  {k: after_m[k]  for k in changed_m},
                })
                return self.send_json_response(200, mission)
        return self.send_json_response(404, {'error': 'Mission not found'})

    def handle_delete_planned_mission(self, mission_id):
        """DELETE /api/planned_missions/<id>"""
        data = load_data()
        if 'planned_missions' not in data['data']:
            return self.send_json_response(404, {'error': 'Mission not found'})

        mission_to_delete = next((m for m in data['data']['planned_missions'] if m['id'] == mission_id), None)
        if not mission_to_delete:
            return self.send_json_response(404, {'error': 'Mission not found'})

        mission_name = mission_to_delete.get('name')
        data['data']['planned_missions'] = [m for m in data['data']['planned_missions'] if m['id'] != mission_id]

        # Remove from config.missions if no other missions have this name
        if mission_name and 'config' in data and 'missions' in data['config']:
            other_planned = [m for m in data['data']['planned_missions'] if m.get('name') == mission_name]
            other_archived = [m for m in data.get('data', {}).get('archived_missions', []) if m.get('name') == mission_name]
            if not other_planned and not other_archived and mission_name in data['config']['missions']:
                data['config']['missions'].remove(mission_name)

        save_data(data)
        audit_log('delete', 'mission', mission_id, {'name': mission_name})
        return self.send_json_response(200, {'message': 'Deleted'})

    def handle_end_mission(self, mission_id, post_data=None):
        """POST /api/planned_missions/<id> - End mission: archive it and clear device assignments"""
        data = load_data()
        mission = None
        # Find the mission
        for m in data.get('data', {}).get('planned_missions', []):
            if m['id'] == mission_id:
                mission = m
                break
        if not mission:
            return self.send_json_response(404, {'error': 'Mission not found'})

        mission_name = mission.get('name', '')

        # Clear mission_name, owner, role, and frequency from all assigned radios
        # (covers both current and standby state)
        for radio in data.get('data', {}).get('radios', []):
            if radio.get('mission_name') == mission_name:
                radio['mission_name'] = None
                radio['owner'] = None
                radio['role'] = None
                radio['frequency'] = None
            if radio.get('standby_mission') == mission_name:
                radio['standby_mission'] = None
                radio['standby_owner'] = None
                radio['standby_role'] = None
                radio['standby_frequency'] = None

        # Move mission to archived_missions
        if 'archived_missions' not in data['data']:
            data['data']['archived_missions'] = []
        mission['ended_at'] = datetime.now().isoformat()
        data['data']['archived_missions'].append(mission)

        # Remove from planned_missions
        data['data']['planned_missions'] = [m for m in data['data']['planned_missions'] if m['id'] != mission_id]

        save_data(data)
        audit_log('end_mission', 'mission', mission_id, {'name': mission_name})
        return self.send_json_response(200, {'message': 'Mission ended', 'archived': mission})

    def handle_start_mission(self, mission_id, post_data=None):
        """POST /api/planned_missions/<id>/start - Start mission with device assignment"""
        data = load_data()
        mission = None
        for m in data.get('data', {}).get('planned_missions', []):
            if m['id'] == mission_id:
                mission = m
                break
        if not mission:
            return self.send_json_response(404, {'error': 'Mission not found'})

        requirements = mission.get('requirements', [])
        mission_name = mission.get('name', '')
        mission_owner = mission.get('owner', '')
        errors = []
        assignments = []

        for req in requirements:
            site_id = req.get('siteId')
            device_type = req.get('device_type') or req.get('deviceType')
            req_frequency = req.get('frequency')
            req_role = req.get('role')

            # Find available device
            found = False
            for radio in data.get('data', {}).get('radios', []):
                if (radio.get('site_id') == site_id or site_id is None) and \
                   radio.get('device_type') == device_type and \
                   radio.get('status') == 'Usable' and \
                   (not radio.get('mission_name') or radio.get('mission_name') == 'Routine'):
                    # Assign this device to the mission
                    new_frequency = req_frequency if req_frequency else radio.get('frequency', 0)
                    radio['mission_name'] = mission_name
                    radio['owner'] = mission_owner or radio.get('owner')
                    radio['frequency'] = new_frequency
                    radio['role'] = req_role if req_role else None
                    found = True
                    break

            if not found:
                site_name = next((s.get('name', 'Unknown') for s in data.get('data', {}).get('sites', []) if s.get('id') == site_id), site_id or 'Any Site')
                errors.append(f'No available {device_type} at {site_name}')

        if errors:
            return self.send_json_response(400, {'error': 'Requirements not satisfied', 'details': errors})

        save_data(data)
        audit_log('start_mission', 'mission', mission_id, {'name': mission_name})
        return self.send_json_response(200, {'message': 'Mission started', 'mission': mission})

    def handle_archive_mission(self, mission_id):
        """POST /api/planned_missions/<id>/archive - Move to archive without ending"""
        data = load_data()
        mission = None
        for m in data.get('data', {}).get('planned_missions', []):
            if m['id'] == mission_id:
                mission = m
                break
        if not mission:
            return self.send_json_response(404, {'error': 'Mission not found'})

        # Check if any devices are allocated to this mission
        mission_name = mission.get('name', '')
        allocated_devices = [
            r for r in data.get('data', {}).get('radios', [])
            if r.get('mission_name') == mission_name
        ]
        if allocated_devices:
            return self.send_json_response(400, {'error': 'Cannot archive mission with allocated devices. End the mission first.'})

        if 'archived_missions' not in data['data']:
            data['data']['archived_missions'] = []
        mission['archived_at'] = datetime.now().isoformat()
        data['data']['archived_missions'].append(mission)
        data['data']['planned_missions'] = [m for m in data['data']['planned_missions'] if m['id'] != mission_id]

        save_data(data)
        audit_log('archive', 'mission', mission_id, {'name': mission.get('name')})
        return self.send_json_response(200, {'message': 'Mission archived', 'archived': mission})

    def handle_restore_archived_mission(self, mission_id):
        """POST /api/archived_missions/<id>/restore - Restore from archive to active"""
        data = load_data()
        mission = None
        for m in data.get('data', {}).get('archived_missions', []):
            if m['id'] == mission_id:
                mission = m
                break
        if not mission:
            return self.send_json_response(404, {'error': 'Archived mission not found'})

        if 'planned_missions' not in data['data']:
            data['data']['planned_missions'] = []
        # Remove archive-specific fields
        mission.pop('archived_at', None)
        mission.pop('ended_at', None)
        data['data']['planned_missions'].append(mission)
        data['data']['archived_missions'] = [m for m in data['data']['archived_missions'] if m['id'] != mission_id]

        save_data(data)
        audit_log('restore', 'mission', mission_id, {'name': mission.get('name')})
        return self.send_json_response(200, {'message': 'Mission restored', 'mission': mission})

    def handle_archive_archived_mission(self, mission_id):
        """POST /api/archived_missions/<id>/archive - Move archived mission back to active (alias for restore)"""
        return self.handle_restore_archived_mission(mission_id)

    def handle_delete_archived_mission(self, mission_id):
        """DELETE /api/archived_missions/<id> - Permanently delete archived mission"""
        data = load_data()
        mission = None
        for m in data.get('data', {}).get('archived_missions', []):
            if m['id'] == mission_id:
                mission = m
                break
        if not mission:
            return self.send_json_response(404, {'error': 'Archived mission not found'})

        mission_name = mission.get('name', '')
        # Remove mission name from config.missions if no other missions have this name
        other_planned = [m for m in data.get('data', {}).get('planned_missions', []) if m.get('name') == mission_name]
        other_archived = [m for m in data.get('data', {}).get('archived_missions', []) if m.get('name') == mission_name and m['id'] != mission_id]
        if not other_planned and not other_archived and mission_name in data.get('config', {}).get('missions', []):
            data['config']['missions'].remove(mission_name)

        data['data']['archived_missions'] = [m for m in data['data']['archived_missions'] if m['id'] != mission_id]
        save_data(data)
        audit_log('delete', 'archived_mission', mission_id, {'name': mission_name})
        return self.send_json_response(200, {'message': 'Archived mission deleted'})

    def handle_get_links(self):
        """GET /api/links"""
        mapping = load_mapping()
        links = mapping.get('mappings', [])
        return self.send_json_response(200, links)

    def handle_create_link(self, post_data):
        """POST /api/links"""
        mapping = load_mapping()
        new_link = {
            'id': generate_id('link'),
            'link_name': post_data.get('link_name', ''),
            'frequency': post_data.get('frequency', 0.0),
            'frequency_band': post_data.get('frequency_band', None),
            'owner': post_data.get('owner', '')
        }
        mapping['mappings'].append(new_link)
        save_mapping(mapping)
        audit_log('create', 'link', new_link['id'], {'link_name': new_link['link_name']})
        return self.send_json_response(201, new_link)

    def handle_update_link(self, link_id, post_data):
        """POST /api/links/<id>"""
        mapping = load_mapping()
        post_data.pop('id', None)
        for link in mapping['mappings']:
            if link['id'] == link_id:
                before = {k: link.get(k) for k in ('link_name', 'frequency', 'frequency_band', 'owner')}
                link.update(post_data)
                save_mapping(mapping)
                after = {k: link.get(k) for k in ('link_name', 'frequency', 'frequency_band', 'owner')}
                changed = [k for k in before if before[k] != after[k]]
                audit_log('update', 'link', link_id, {
                    'before': {k: before[k] for k in changed},
                    'after':  {k: after[k]  for k in changed},
                })
                return self.send_json_response(200, link)
        return self.send_json_response(404, {'error': 'Link not found'})

    def handle_delete_link(self, link_id):
        """DELETE /api/links/<id>"""
        mapping = load_mapping()
        mapping['mappings'] = [l for l in mapping['mappings'] if l['id'] != link_id]
        save_mapping(mapping)
        audit_log('delete', 'link', link_id)
        return self.send_json_response(200, {'message': 'Deleted'})

    # ==================== Batch Operations ====================

    def handle_batch_clear_site(self, post_data):
        """POST /api/batch/clear_site - Clear all device assignments at a site"""
        site_id = post_data.get('site_id')
        if not site_id:
            return self.send_json_response(400, {'error': 'site_id is required'})

        data = load_data()
        cleared = 0
        for radio in data.get('data', {}).get('radios', []):
            if radio.get('site_id') == site_id:
                radio['frequency'] = None
                radio['owner'] = None
                radio['mission_name'] = None
                radio['role'] = None
                radio['standby_frequency'] = None
                radio['standby_owner'] = None
                radio['standby_mission'] = None
                radio['standby_role'] = None
                radio['notes'] = None
                cleared += 1

        save_data(data)
        audit_log('batch_clear', 'site', site_id, {'devices_cleared': cleared})
        return self.send_json_response(200, {'message': f'{cleared} device(s) cleared', 'cleared': cleared})

    # ==================== Audit Log ====================

    def handle_get_audit(self, parsed_path=None):
        """GET /api/audit - Return the last N audit log entries, newest first"""
        try:
            limit = 200
            if parsed_path and parsed_path.query:
                from urllib.parse import parse_qs
                params = parse_qs(parsed_path.query)
                if 'limit' in params:
                    try:
                        limit = min(int(params['limit'][0]), 1000)
                    except (ValueError, IndexError):
                        pass

            if not os.path.exists(AUDIT_LOG_FILE):
                return self.send_json_response(200, [])

            with open(AUDIT_LOG_FILE, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            recent = lines[-limit:] if len(lines) > limit else lines
            entries = []
            for line in reversed(recent):
                line = line.strip()
                if line:
                    try:
                        entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass

            return self.send_json_response(200, entries)
        except Exception as e:
            return self.send_json_response(500, {'error': str(e)})

    # ==================== Export / Import ====================

    def handle_export(self):
        """GET /api/export - Export all data and mappings as a single JSON backup"""
        data = load_data()
        mapping = load_mapping()
        export_payload = {
            'exported_at': datetime.now().isoformat(),
            'data': data,
            'mapping': mapping,
        }
        return self.send_json_response(200, export_payload)

    def handle_import(self, post_data):
        """POST /api/import - Import a full backup, replacing all data"""
        if 'data' not in post_data:
            return self.send_json_response(400, {'error': 'Missing "data" key in import payload'})

        imported_data = post_data['data']

        # Basic structural validation
        if 'config' not in imported_data or 'data' not in imported_data:
            return self.send_json_response(400, {'error': 'Invalid data structure: must contain "config" and "data" keys'})

        required_data_keys = {'sectors', 'sites', 'radios'}
        if not required_data_keys.issubset(set(imported_data.get('data', {}).keys())):
            return self.send_json_response(400, {'error': f'Invalid data structure: "data" must contain {required_data_keys}'})

        # Migrate imported data to current schema before saving
        migrate_config(imported_data)
        save_data(imported_data)

        # Import mapping if present
        if 'mapping' in post_data:
            imported_mapping = post_data['mapping']
            if 'mappings' in imported_mapping:
                save_mapping(imported_mapping)

        audit_log('import', 'full_backup', details={'sectors': len(imported_data['data'].get('sectors', [])), 'sites': len(imported_data['data'].get('sites', [])), 'radios': len(imported_data['data'].get('radios', []))})
        return self.send_json_response(200, {'message': 'Data imported successfully'})

    # ==================== Helper Methods ====================

    def serve_static_file(self, path):
        """Serve static files from frontend directory"""
        if path == '/' or path == '':
            path = '/index.html'

        file_path = os.path.join(FRONTEND_DIR, path.lstrip('/'))

        # Security check: prevent directory traversal
        if '..' in file_path or not os.path.abspath(file_path).startswith(os.path.abspath(FRONTEND_DIR)):
            return self.send_json_response(403, {'error': 'Forbidden'})

        try:
            with open(file_path, 'rb') as f:
                content = f.read()

            # Determine MIME type
            mime_type, _ = mimetypes.guess_type(file_path)
            if mime_type is None:
                mime_type = 'application/octet-stream'

            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', len(content))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            return self.send_json_response(404, {'error': 'File not found'})

    def send_json_response(self, status_code, data):
        """Send JSON response"""
        response_body = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(response_body))
        self.end_headers()
        self.wfile.write(response_body)

    def end_headers(self):
        """Add CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def log_message(self, format, *args):
        """Custom logging"""
        print(f"[{self.log_date_time_string()}] {format % args}")

# ==================== Server Startup ====================

if __name__ == '__main__':
    # Create frontend directory if it doesn't exist
    os.makedirs(FRONTEND_DIR, exist_ok=True)

    # Initialize data files if they don't exist, migrate if they do
    if not os.path.exists(DATA_FILE):
        save_data(_make_default_data())
    else:
        load_data()  # triggers migrate_config + save if schema changed

    if not os.path.exists(MAPPING_FILE):
        save_mapping({"mappings": []})

    server_address = (HOST, PORT)
    httpd = http.server.HTTPServer(server_address, RadioManagerHandler)

    print(f"🚀 Server starting on port {PORT} (host: {HOST})")
    print(f"📡 Frontend available at the service URL")
    print(f"📊 API Base: /api/")
    print("Press Ctrl+C to stop the server")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n✅ Server stopped.")
        httpd.server_close()
