# 📚 wann fahrma OIDA - Dokumentation

Zentrale Dokumentation für das wann fahrma OIDA Projekt.

## 📋 Übersicht

**wann fahrma OIDA** ist eine Webapp für Wiener ÖPNV-Abfahrtszeiten mit Dashboard-Funktionalität, Benutzerauthentifizierung und modernem Design.

## 📖 Dokumentation

### 🚀 Installation & Setup
- **[Ubuntu Installation](INSTALL-UBUNTU.md)** - Vollständige Server-Installation
- **[Auth Setup Guide](auth-setup-guide.md)** - Supabase Authentication Setup
- **[Security Fix](SECURITY-FIX.md)** - Kritische Sicherheitsverbesserungen

### 🔒 Sicherheit
- **[Security Guidelines](SECURITY.md)** - Umfassende Sicherheitsrichtlinien
- **[Auth Implementation](auth-implementation-summary.md)** - Authentication-System Details

### 🎨 Features
- **[Cycling Demo](cycling-demo.md)** - Dashboard-Cycling Feature Dokumentation

## 🛠️ Scripts & Tools

### 📦 Installation Scripts
Alle Installationsskripts finden Sie unter `../scripts/install/`:
- `install-ubuntu.sh` - Vollständige Ubuntu Server Installation
- `install-quick.sh` - Schnelle Basis-Installation
- `test-install.sh` - System-Check vor Installation

### 🔒 Security Scripts
Sicherheitstools unter `../scripts/security/`:
- `security-check.sh` - Linux Security Check
- `security-check.bat` - Windows Security Check

### 🚀 Deployment Scripts
Deployment-Tools unter `../scripts/deployment/`:
- `deploy.sh` - Production Deployment
- `ecosystem.config.js` - PM2 Konfiguration

## 🏗️ Projekt-Struktur

```
wannfahrma-v1/
├── docs/                          # 📚 Dokumentation
│   ├── README.md                 # Diese Datei
│   ├── INSTALL-UBUNTU.md         # Ubuntu Installation
│   ├── SECURITY.md               # Sicherheitsrichtlinien
│   └── ...                       # Weitere Docs
├── scripts/                      # 🛠️ Hilfsskripts
│   ├── install/                  # Installation
│   ├── security/                 # Sicherheit
│   └── deployment/               # Deployment
├── app.js                        # 🎯 Haupt-Anwendung
├── server.js                     # 🖥️ Backend Server
├── index.html                    # 🌐 Frontend
├── config.js                     # ⚙️ Konfiguration
├── supabase-config.js            # 🔐 Supabase Setup
└── ...                           # Weitere Core-Dateien
```

## 🚀 Quick Start

### 1. Lokale Entwicklung
```bash
# Dependencies installieren
npm install

# Konfiguration erstellen
cp .env.example .env
# .env mit echten Werten füllen

# Entwicklungsserver starten
npm start
```

### 2. Production Deployment
```bash
# Ubuntu Server Installation
chmod +x scripts/install/install-ubuntu.sh
./scripts/install/install-ubuntu.sh

# Oder Schnell-Installation
chmod +x scripts/install/install-quick.sh
./scripts/install/install-quick.sh
```

### 3. Security Check
```bash
# Linux/macOS
./scripts/security/security-check.sh

# Windows
.\scripts\security\security-check.bat
```

## 🔧 Konfiguration

### Umgebungsvariablen (.env)
```bash
# Server
PORT=3000
NODE_ENV=production

# Supabase (optional für Auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# API
API_BASE_URL=https://www.wienerlinien.at/ogd_realtime
API_TIMEOUT=10000
```

### Features
- ✅ **Dashboard** - Personalisierte ÖPNV-Karten
- ✅ **Real-time Data** - Live Abfahrtszeiten
- ✅ **User Authentication** - Supabase Integration
- ✅ **Responsive Design** - Mobile & Desktop
- ✅ **Cycling Animation** - Animierte Fahrzeuge
- ✅ **Data Persistence** - localStorage & Cloud-Sync

## 🤝 Entwicklung

### Technologie-Stack
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: PM2, Nginx, Ubuntu Server

### Code-Standards
- ES6+ JavaScript
- Responsive CSS
- Semantic HTML
- Git Flow
- Security-First Approach

## 📞 Support

### Dokumentation
- 📖 Alle Docs in diesem `docs/` Ordner
- 🔧 Scripts unter `scripts/`
- 🐛 Issues auf GitHub

### Sicherheit
- 🔒 Security Guidelines befolgen
- 🚨 Security-Checks vor Commits
- 🔑 Keine Secrets in Git

---

🚇 **Viel Spaß mit wann fahrma OIDA!**

*Für spezielle Fragen siehe die entsprechenden Dokumentationsdateien oder erstellen Sie ein GitHub Issue.*
