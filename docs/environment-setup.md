# Environment Variables Server Integration

## Problem
Die Supabase-Konfiguration wird nicht korrekt zwischen Server und Browser übertragen, was zu Fehlermeldungen bei der lokalen Entwicklung führt.

## Lösung

### 1. Lokale Entwicklung
**Server:** `server.js` oder `dev-server.js`
- Route `/api/env` stellt sichere Environment-Variablen bereit
- Lädt `.env` Datei und filtert öffentliche Variablen

**Browser:** `index.html`
- Lädt Environment-Variablen über `/api/env`
- Fallback für lokale Entwicklung ohne Server

### 2. Production
**Server-Injection (Empfohlen):**
```html
<script>
    window.ENV_VARS = {
        SUPABASE_URL: "{{ SUPABASE_URL }}",
        SUPABASE_ANON_KEY: "{{ SUPABASE_ANON_KEY }}",
        DEBUG_MODE: "{{ DEBUG_MODE }}",
        ENABLE_USER_AUTH: "{{ ENABLE_USER_AUTH }}"
    };
</script>
```

**API-Fallback:**
- Route `/api/env` funktioniert auch in Production
- Sichere Übertragung von Environment-Variablen

## Server-Routes

### `/api/env`
```javascript
app.get('/api/env', (req, res) => {
    const publicVars = {
        DEBUG_MODE: process.env.DEBUG_MODE || 'false',
        ENABLE_USER_AUTH: process.env.ENABLE_USER_AUTH || 'true',
        ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS || 'false'
    };
    
    // Nur valide Supabase-Konfiguration hinzufügen
    if (process.env.SUPABASE_URL && 
        process.env.SUPABASE_ANON_KEY && 
        !process.env.SUPABASE_URL.includes('your-project')) {
        publicVars.SUPABASE_URL = process.env.SUPABASE_URL;
        publicVars.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    }
    
    res.json(publicVars);
});
```

## Feature-Flags

### `ENABLE_USER_AUTH=false`
- Deaktiviert Supabase-Warnungen
- Verwendet lokalen Modus ohne Authentication
- Ideal für Entwicklung ohne Supabase-Setup

### `DEBUG_MODE=true`
- Erweiterte Logging-Ausgabe
- Konfiguration wird in Konsole angezeigt

## Verwendung

### Lokale Entwicklung
```bash
# In .env setzen:
ENABLE_USER_AUTH=false
DEBUG_MODE=true

# Server starten:
node server.js  # Port 3000
# oder
node dev-server.js  # Port 3001
```

### Production
```bash
# In .env setzen:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-real-anon-key
ENABLE_USER_AUTH=true
DEBUG_MODE=false
```

## Vorteile
- ✅ Keine Supabase-Warnungen bei lokaler Entwicklung
- ✅ Sichere Übertragung von Environment-Variablen
- ✅ Automatische Erkennung von lokaler vs. Production
- ✅ Fallback-Mechanismen für alle Szenarien
- ✅ Feature-Flags für flexible Konfiguration
