# WannFahrMa-V1 🚇

Eine moderne Web-Anwendung für Live-Abfahrtsdaten der öffentlichen Verkehrsmittel in Wien.

## 🚀 Features

- **Live-Abfahrtsdaten** von der offiziellen Wiener Linien API
- **1980 Stationen** mit über 4000 RBL-Nummern
- **Echtzeitsuche** mit dynamischer Filterung
- **Responsive Design** für alle Geräte
- **CORS-Proxy** für API-Zugriff ohne Browser-Einschränkungen

## 📋 Verkehrsmittel

- 🚇 **U-Bahn** (U1, U2, U3, U4, U6)
- 🚋 **Straßenbahn** (alle Linien)
- 🚌 **Bus** (Stadt- und Regionalbusse)

## 🛠️ Installation

### Voraussetzungen
- Python 3.x
- Moderne Browser (Chrome, Firefox, Safari, Edge)

### Setup
1. Repository klonen:
```bash
git clone https://github.com/ochtii/wannfahrma-v1.git
cd wannfahrma-v1
```

2. Daten verarbeiten:
```bash
python process_data.py
```

3. API-Proxy starten:
```bash
python api_proxy.py
```

4. Web-Server starten:
```bash
python -m http.server 8001
```

5. Browser öffnen: `http://localhost:8001`

## 🏗️ Architektur

```
├── index.html          # Hauptanwendung
├── app.js              # JavaScript-Logik
├── style.css           # Styling
├── api_proxy.py        # CORS-Proxy für Wiener Linien API
├── process_data.py     # CSV-Datenverarbeitung
├── wien_opnv_data.json # Verarbeitete Stationsdaten
└── data/               # Rohdaten (CSV, GTFS, etc.)
```

## 📊 Datenquellen

- **Wiener Linien Open Data** (Stationen, Linien, Haltestellen)
- **Wiener Linien Real-Time API** (Live-Abfahrtsdaten)
- **ÖBB Open Data** (Erweiterte Verkehrsdaten)

## 🔧 Technische Details

### Frontend
- Vanilla JavaScript (ES6+)
- CSS3 mit Flexbox/Grid
- Responsive Design
- FontAwesome Icons

### Backend
- Python HTTP Server
- CORS-Proxy für API-Zugriff
- pandas für Datenverarbeitung

### API Integration
- Wiener Linien Real-Time Monitor API
- Automatische RBL-Gruppierung pro Station
- Fehlerbehandlung und Fallback-Daten

## 🎨 Benutzeroberfläche

- **Suchfeld**: Live-Filterung aller Stationen
- **Stationsliste**: Klickbare Stationen mit RBL-Anzahl
- **Abfahrtstafel**: Live-Daten im Wiener Linien Design
- **Zeit-Badges**: Countdown in Minuten oder "Jetzt"

## 🚦 API-Endpunkte

### Lokaler CORS-Proxy
```
GET http://localhost:3001/monitor?rbl=<RBL_NUMMER>
```

### Originale Wiener Linien API
```
https://www.wienerlinien.at/ogd_realtime/monitor?rbl=<RBL_NUMMER>
```

## 📱 Browser-Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## 🔍 Debugging

### Häufige Probleme
1. **CORS-Fehler**: API-Proxy muss laufen (`python api_proxy.py`)
2. **Keine Stationen**: Daten verarbeiten (`python process_data.py`)
3. **Server-Fehler**: Port 8001 und 3001 müssen frei sein

### Logs
- API-Proxy: Konsolen-Output
- Browser: Developer Tools → Console
- Server: Terminal-Output

## 📄 Lizenz

Dieses Projekt verwendet Open Data der Wiener Linien und ÖBB.

## 🤝 Beitragen

1. Fork des Repositories
2. Feature-Branch erstellen
3. Änderungen committen
4. Pull Request stellen

## 📞 Support

Bei Fragen oder Problemen bitte ein Issue erstellen.

---

**Entwickelt für Wien** 🇦🇹
