#!/usr/bin/env node
/**
 * Build consolidated stations dataset from Wiener Linien OGD CSV exports.
 * Steps:
 * 1. Parse haltestellen (stops) and haltepunkte (platform points)
 * 2. Group platforms/points by logical station (DIVA/StopText normalization)
 * 3. Aggregate:
 *    - stationId (DIVA if available else synthetic)
 *    - name (canonical StopText variant)
 *    - municipality / coords (average or primary) 
 *    - rbls: list of { stopId, diva, name, longitude, latitude }
 *    - lines: collected via API live query per RBL (dedup + mode tagging) if possible
 * 4. Verify each station via Wiener Linien realtime API (optional, with rate limiting)
 * 5. Emit JSON to data/generated/wien_stations_enriched.json
 * 6. Verbose terminal logging for each action
 *
 * Usage: node scripts/build_stations.js [--limit=N] [--no-api]
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'wiener_linien');
const OUTPUT_DIR = path.join(ROOT, 'data', 'generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'wien_stations_enriched.json');

const ARG_LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);
const USE_API = !process.argv.includes('--no-api');
const USE_LOCAL_API = process.argv.includes('--local-api');
const LOCAL_BASE = process.env.LOCAL_API_BASE || 'http://localhost:3000';

// Cache für bereits ermittelte Linien pro RBL (verhindert doppelte API-Calls)
const RBL_LINES_CACHE = new Map();

function log(step, msg, extra) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${step}] ${msg}`;
  if (extra !== undefined) {
    console.log(base, typeof extra === 'object' ? JSON.stringify(extra) : extra);
  } else {
    console.log(base);
  }
}

function normalizeName(name) {
  if (!name) return '';
  return name
    .replace(/\s+/g, ' ')            // collapse spaces
    .replace(/ ,/g, ',')
    .replace(/U\b/g, 'U')
    .trim();
}

async function parseCsv(file, hasHeader = true) {
  const rows = [];
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  log('READ', `Opening ${file}`);
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, 'utf8'),
    crlfDelay: Infinity
  });
  let lineNo = 0;
  let headers = [];
  for await (const line of rl) {
    lineNo++;
    if (!line.trim()) continue;
    const parts = line.split(';');
    if (lineNo === 1 && hasHeader) {
      headers = parts.map(p => p.trim());
      continue;
    }
    const obj = {};
    parts.forEach((p, i) => {
      const key = headers[i] || `col${i}`;
      obj[key] = p === '' ? null : p;
    });
    rows.push(obj);
  }
  log('PARSE', `Parsed ${rows.length} rows from ${file}`);
  return rows;
}

function groupStations(haltestellen) {
  const byKey = new Map();
  for (const row of haltestellen) {
    const diva = row.DIVA || null;
  // In haltestellen CSV the column is PlatformText (not StopText). Provide multiple fallbacks.
  const name = normalizeName(row.StopText || row.PlatformText || row.Platformtext || row.name || '');
    if (!name) continue;
    const key = diva ? `D:${diva}` : `N:${name.toLowerCase()}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        stationId: diva || `synthetic_${Buffer.from(name).toString('hex').slice(0,12)}`,
        diva: diva,
        name,
        municipality: row.Municipality || null,
        municipalityId: row.MunicipalityID || null,
        longitude: row.Longitude ? parseFloat(row.Longitude) : null,
        latitude: row.Latitude ? parseFloat(row.Latitude) : null,
        rbls: [],
        lines: new Set(),
        raw: []
      });
    }
    const st = byKey.get(key);
    st.raw.push(row);
    if (row.Longitude && row.Latitude) {
      // Override centroid with first valid coordinate if missing
      if (st.longitude == null || st.latitude == null) {
        st.longitude = parseFloat(row.Longitude);
        st.latitude = parseFloat(row.Latitude);
      }
    }
  }
  log('GROUP', `Created ${byKey.size} station groups`);
  if (byKey.size === 0) {
    log('WARN', 'No station groups created. Check CSV headers (expected PlatformText column).');
  }
  return byKey;
}

async function enrichWithHaltepunkte(groups, haltepunkte) {
  // We attempt to match by StopText & DIVA
  const idx = new Map();
  for (const hp of haltepunkte) {
    const diva = hp.DIVA || null;
  const name = normalizeName(hp.StopText || hp.PlatformText || hp.Platformtext || '');
    if (!name) continue;
    const candidates = [];
    if (diva) candidates.push(`D:${diva}`);
    candidates.push(`N:${name.toLowerCase()}`);
    for (const key of candidates) {
      if (groups.has(key)) {
        const g = groups.get(key);
        g.rbls.push({
          stopId: hp.StopID || null,
          diva: hp.DIVA || null,
          name: name,
          longitude: hp.Longitude ? parseFloat(hp.Longitude) : null,
          latitude: hp.Latitude ? parseFloat(hp.Latitude) : null
        });
        break;
      }
    }
  }
  log('ENRICH', 'Mapped haltepunkte to groups');
}

async function fetchLinesForRbl(rbl) {
  if (!rbl) return [];
  if (RBL_LINES_CACHE.has(rbl)) {
    return RBL_LINES_CACHE.get(rbl);
  }
  let url;
  if (USE_LOCAL_API) {
    url = `${LOCAL_BASE.replace(/\/$/, '')}/api/departures/${encodeURIComponent(rbl)}`;
  } else {
    url = `https://www.wienerlinien.at/ogd_realtime/monitor?rbl=${encodeURIComponent(rbl)}`;
  }
  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    const monitors = data?.data?.monitors || [];
    const lines = new Set();
    for (const m of monitors) {
      (m.lines || []).forEach(line => {
        if (line?.name) lines.add(line.name);
      });
    }
    const arr = Array.from(lines);
    RBL_LINES_CACHE.set(rbl, arr);
    return arr;
  } catch (e) {
    log('APIERR', `Failed to fetch lines for RBL ${rbl}: ${e.message}`);
    RBL_LINES_CACHE.set(rbl, []); // Negative Cache
    return [];
  }
}

async function enrichLines(groups, limitRblPerStation = 3) {
  if (!USE_API) {
    log('SKIP', 'API enrichment disabled');
    return;
  }
  const stationEntries = Array.from(groups.values());
  let stationCounter = 0;
  for (const st of stationEntries) {
    stationCounter++;
    if (ARG_LIMIT && stationCounter > ARG_LIMIT) break;
    if (!st.rbls.length) continue;
    log('API', `Station ${st.name} (${st.stationId}) - querying up to ${limitRblPerStation} RBLs`);
    const slice = st.rbls.slice(0, limitRblPerStation);
    for (const r of slice) {
      const lines = await fetchLinesForRbl(r.stopId);
      if (lines.length) {
        lines.forEach(l => st.lines.add(l));
      }
      // Kürzere Pause wenn lokaler Proxy genutzt wird, sonst konservativ bleiben
      const delay = USE_LOCAL_API ? 150 : 350;
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

function finalize(groups) {
  const result = [];
  for (const g of groups.values()) {
    result.push({
      stationId: g.stationId,
      diva: g.diva,
      name: g.name,
      municipality: g.municipality,
      municipalityId: g.municipalityId,
      longitude: g.longitude,
      latitude: g.latitude,
      rbls: g.rbls,
      lines: Array.from(g.lines).sort(),
      rbl_count: g.rbls.length
    });
  }
  // Sort deterministically
  result.sort((a,b) => a.name.localeCompare(b.name, 'de-AT'));
  return result;
}

async function main() {
  try {
    log('START', 'Building Wiener Linien stations dataset');
    if (USE_API) {
      log('CFG', `API Enrichment aktiv (local=${USE_LOCAL_API})`);
    } else {
      log('CFG', 'API Enrichment deaktiviert (--no-api)');
    }
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const haltestellen = await parseCsv('wienerlinien-ogd-haltestellen.csv');
    const haltepunkte = await parseCsv('wienerlinien-ogd-haltepunkte.csv');

    const groups = groupStations(haltestellen);
    await enrichWithHaltepunkte(groups, haltepunkte);
    await enrichLines(groups);

    const stations = finalize(groups);

    const payload = {
      generatedAt: new Date().toISOString(),
      source: 'wienerlinien-ogd',
      stationCount: stations.length,
      stations
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
    log('WRITE', `Wrote ${stations.length} stations to ${OUTPUT_FILE}`);
    log('DONE', 'All tasks complete');
  } catch (e) {
    log('FATAL', e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
