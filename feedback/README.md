# 📝 Feedback System für wann fahrma OIDA

Ein eigenständiges Feedback-API-System für die wann fahrma OIDA App.

## 🚀 Features

- **Separater API-Server** auf Port 3002
- **Strukturierte lokale Speicherung** in JSON-Dateien
- **Vollständiges Logging** aller Feedback-Aktivitäten
- **REST API** für Frontend-Integration
- **Web-Interface** für Feedback-Verwaltung
- **Statistiken** und Auswertungen
- **CORS-Support** für Frontend-Integration

## 📁 Struktur

```
feedback/
├── feedback-api.js      # Haupt-API-Server
├── package.json         # Dependencies
├── index.html          # Web-Interface
├── README.md           # Diese Datei
├── data/               # Feedback-Daten (JSON-Dateien)
│   └── feedback_YYYY-MM-DD.json
└── logs/               # API-Logs
    └── feedback.log
```

## 🔧 Installation

1. **Dependencies installieren:**
   ```bash
   cd feedback
   npm install
   ```

2. **API starten:**
   ```bash
   npm start
   # oder für Development:
   npm run dev
   ```

3. **API ist verfügbar unter:**
   - API: `http://localhost:3002`
   - Web-Interface: `http://localhost:3002` (index.html öffnen)

## 📊 API Endpoints

### POST /api/feedback
Neues Feedback senden

**Request Body:**
```json
{
  "message": "Feedback-Text (required)",
  "type": "general|bug|feature|improvement",
  "rating": 1-5,
  "page": "Seitenname",
  "url": "Current URL",
  "browser": "User-Agent",
  "screen": "Screen resolution",
  "additional": "Extra metadata"
}
```

**Response:**
```json
{
  "success": true,
  "id": "unique-id",
  "message": "Feedback saved successfully",
  "timestamp": "2025-08-23T10:00:00.000Z"
}
```

### GET /api/feedback/stats
Feedback-Statistiken abrufen

**Response:**
```json
{
  "total": 42,
  "files": 5,
  "types": {
    "general": 20,
    "bug": 10,
    "feature": 8,
    "improvement": 4
  },
  "ratings": {
    "1": 2,
    "2": 3,
    "3": 8,
    "4": 15,
    "5": 14
  },
  "daily": {
    "2025-08-23": 15,
    "2025-08-22": 12,
    "2025-08-21": 15
  }
}
```

### GET /api/feedback/recent?limit=10
Aktuelles Feedback (letzte 24h)

**Response:**
```json
{
  "count": 3,
  "feedback": [
    {
      "id": "abc123",
      "timestamp": "2025-08-23T10:00:00.000Z",
      "type": "general",
      "rating": 5,
      "message": "Super App!",
      "metadata": {
        "page": "Hauptseite",
        "browser": "Chrome/120.0"
      }
    }
  ]
}
```

### GET /health
Health Check

**Response:**
```json
{
  "status": "ok",
  "service": "feedback-api",
  "timestamp": "2025-08-23T10:00:00.000Z",
  "port": 3002
}
```

## 💾 Datenstruktur

### Feedback-Datei (feedback_YYYY-MM-DD.json)
```json
[
  {
    "id": "unique-8-char-id",
    "timestamp": "2025-08-23T10:00:00.000Z",
    "message": "Feedback-Text",
    "type": "general|bug|feature|improvement",
    "rating": 1-5,
    "ip": "Client-IP",
    "userAgent": "Browser-Info",
    "metadata": {
      "url": "Current URL",
      "page": "Page name",
      "browser": "Browser details",
      "screen": "Screen resolution",
      "additional": "Extra data"
    }
  }
]
```

### Log-Datei (feedback.log)
```
[2025-08-23T10:00:00.000Z] FEEDBACK_SAVED from 192.168.1.100: {"id":"abc123","type":"general","rating":5}
[2025-08-23T10:01:00.000Z] STATS_REQUEST from 192.168.1.100: {"total":42}
```

## 🎨 Web-Interface Features

- **Feedback-Formular** mit Kategorien und Bewertung
- **Live-Statistiken** mit grafischer Darstellung
- **Aktuelles Feedback** der letzten 24h
- **Responsive Design** für alle Geräte
- **Echtzeit-Updates** nach Feedback-Submission

## 🔗 Integration in Haupt-App

Das Feedback-System kann einfach in die Haupt-App integriert werden:

```javascript
// Feedback senden
async function sendFeedback(message, type = 'general', rating = null) {
  const response = await fetch('http://localhost:3002/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      type,
      rating,
      page: 'Current Page',
      url: window.location.href,
      browser: navigator.userAgent
    })
  });
  
  return response.json();
}
```

## 🛡️ Sicherheit

- **IP-Tracking** für alle Requests
- **Input-Validierung** für alle Felder
- **Error-Handling** mit detailliertem Logging
- **CORS-Konfiguration** für sichere Frontend-Integration
- **File-basierte Speicherung** ohne externe Datenbank-Dependencies

## 📈 Monitoring

- **Vollständiges Request-Logging** in `logs/feedback.log`
- **Farbiges Console-Logging** für Development
- **Fehler-Tracking** mit Stack-Traces
- **Performance-Metriken** durch Timestamps

## 🔄 Backup & Export

Die Feedback-Daten sind in strukturierten JSON-Dateien gespeichert und können einfach:
- **Gesichert** werden (Copy data/ Ordner)
- **Exportiert** werden (JSON-Format)
- **Analysiert** werden (mit jedem JSON-Tool)
- **Migriert** werden (zu anderen Systemen)

## 🚀 Deployment

Für Production-Deployment:

1. **PM2 konfigurieren:**
   ```bash
   pm2 start feedback-api.js --name feedback-api
   ```

2. **Environment Variables:**
   ```bash
   export FEEDBACK_PORT=3002
   ```

3. **Nginx Proxy (optional):**
   ```nginx
   location /feedback/ {
       proxy_pass http://localhost:3002/;
   }
   ```

## 📝 Changelog

- **v1.0.0** - Initial Release
  - Basis-API mit CRUD-Funktionen
  - Web-Interface für Feedback-Management
  - Strukturierte JSON-Speicherung
  - Vollständiges Logging-System
