# 🚇 wann fahrma OIDA

Eine moderne Web-App für Live-Abfahrtszeiten der Wiener Linien.

## 🚀 Schnellstart

### 1. Abhängigkeiten installieren
```bash
npm install
```

### 2. Daten verarbeiten (einmalig)
```bash
python process_data.py
```

### 3. Server starten
```bash
npm start
```

Die App ist dann verfügbar unter: **http://localhost:3000**

## 📝 Verfügbare Scripts

- `npm start` - Startet den Produktionsserver
- `npm run dev` - Startet den Entwicklungsserver mit Auto-Reload
- `npm run proxy` - Startet nur den API-Proxy (falls benötigt)

## 🛠️ Entwicklung

### Server mit Auto-Reload starten:
```bash
npm run dev
```

### Nur den API-Proxy starten:
```bash
npm run proxy
```

## 📂 Projektstruktur

```
wannfahrma-v1/
├── index.html          # Haupt-HTML-Datei
├── app.js              # Frontend JavaScript
├── style.css           # Styling
├── server.js           # Express Server + API Proxy
├── api_proxy.js        # Standalone API Proxy
├── process_data.py     # Datenverarbeitung
├── package.json        # npm Konfiguration
└── data/               # Rohdaten von Wiener Linien
```

## 🔧 Features

- **Live-Abfahrten** von 1980+ Wiener Linien Stationen
- **Responsive Design** für Desktop und Mobile
- **Echte Daten** von der Wiener Linien API
- **CORS-Proxy** für API-Zugriffe
- **Moderne UI** mit Bootstrap-ähnlichem Design

## 🌐 API Endpoints

- `GET /` - Haupt-App
- `GET /api/departures/:rbl` - Live-Abfahrten für RBL-Nummer
- `GET /health` - Server Health Check

## 📋 Voraussetzungen

- **Node.js** 16+ 
- **Python** 3.x (für Datenverarbeitung)
- **Internet** (für Live-Daten)

## 🔄 Datenaktualisierung

Die Wiener Linien Rohdaten können mit folgendem Befehl neu verarbeitet werden:

```bash
python process_data.py
```

Dies erstellt die `wien_opnv_data.json` Datei mit allen Stationen und RBL-Nummern.

## 🐛 Troubleshooting

### Port bereits verwendet?
```bash
# Anderen Port verwenden:
PORT=3001 npm start
```

### Keine Live-Daten?
1. Prüfen Sie Ihre Internetverbindung
2. Health Check aufrufen: http://localhost:3000/health
3. Browser-Konsole auf Fehler prüfen

### Stationen nicht gefunden?
```bash
# Daten neu verarbeiten:
python process_data.py
```

## 📄 Lizenz

MIT License - Siehe LICENSE Datei für Details.

## 🤝 Beitragen

1. Fork erstellen
2. Feature Branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Pull Request erstellen

---

**Made with ❤️ in Vienna**
