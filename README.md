# 🚇 wann fahrma OIDA

Eine moderne Web-App für Live-Abfahrtszeiten der Wiener Linien mit Dashboard-Funktionalität, Benutzer-Authentication und modernem Design.

> 📚 **Für umfassende Dokumentation siehe: [`docs/README.md`](docs/README.md)**

## 🚀 Quick Start

### 1. Lokale Entwicklung
```bash
# Dependencies installieren
npm install

# Konfiguration (optional für Auth)
cp .env.example .env
# .env mit echten Werten füllen

# Server starten
npm start
```

### 2. Ubuntu Server Installation
```bash
# Vollständige Installation
chmod +x scripts/install/install-ubuntu.sh
./scripts/install/install-ubuntu.sh

# Oder Schnell-Installation
chmod +x scripts/install/install-quick.sh
./scripts/install/install-quick.sh
```

Die App ist dann verfügbar unter: **http://localhost:3000**

## 📚 Dokumentation & Scripts

### 📖 Vollständige Dokumentation
- **[docs/README.md](docs/README.md)** - Zentrale Dokumentation
- **[docs/INSTALL-UBUNTU.md](docs/INSTALL-UBUNTU.md)** - Server Installation
- **[docs/SECURITY.md](docs/SECURITY.md)** - Sicherheitsrichtlinien

### 🛠️ Scripts & Tools
- **[scripts/install/](scripts/install/)** - Installationsskripts
- **[scripts/security/](scripts/security/)** - Sicherheitstools
- **[scripts/deployment/](scripts/deployment/)** - Deployment-Tools

## ✨ Features

- � **Live ÖPNV-Daten** - Real-time Abfahrtszeiten Wiener Linien
- 👤 **User Authentication** - Supabase Integration mit localStorage-Migration
- 📱 **Responsive Design** - Mobile & Desktop optimiert
- 🎯 **Dashboard** - Personalisierte Haltestellen-Sammlung
- 🚋 **Animierte Fahrzeuge** - Cycling mit verschiedenen Fahrzeug-Typen
- 💾 **Data Persistence** - localStorage + Cloud-Synchronisation
- 🔒 **Security** - HTTPS, Input Validation, Rate Limiting

## �📝 Verfügbare NPM Scripts

- `npm start` - Startet den Produktionsserver
- `npm run dev` - Startet den Entwicklungsserver mit Auto-Reload
- `npm run proxy` - Startet nur den API-Proxy (falls benötigt)

## � Projekt-Struktur (Reorganisiert)

```
wannfahrma-v1/
├── docs/                    # 📚 Zentrale Dokumentation
│   ├── README.md           # Haupt-Dokumentation
│   ├── INSTALL-UBUNTU.md   # Server Installation
│   └── ...                 # Weitere Docs
├── scripts/                # 🛠️ Hilfsskripts
│   ├── install/            # Installation Scripts
│   ├── security/           # Security Tools
│   └── deployment/         # Deployment Scripts
├── index.html              # 🌐 Frontend
├── app.js                  # 🎯 Haupt-Anwendung
├── server.js               # 🖥️ Backend Server
├── style.css               # 🎨 Styling
├── config.js               # ⚙️ Basis-Konfiguration
├── supabase-config.js      # 🔐 Supabase Setup
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
