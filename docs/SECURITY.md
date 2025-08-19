# 🔒 Security & Sensitive Data Guidelines

## 📋 Übersicht

Diese Datei erklärt, welche Dateien und Daten sensibel sind und wie sie geschützt werden.

## 🚫 Was wird NICHT versioniert (.gitignore)

### 🔑 Secrets & Credentials
- `.env*` - Umgebungsvariablen mit API-Keys
- `secrets/` - Alle Arten von Geheimnissen
- `*.key`, `*.pem`, `*.crt` - SSL-Zertifikate
- `auth.json`, `credentials.json` - Authentifizierungsdaten

### 🗄️ Database & Supabase
- `supabase/.env` - Supabase lokale Konfiguration
- `supabase/config.toml` - Supabase Projekt-Konfiguration
- `*.sqlite*` - Lokale Datenbanken
- `backup.sql`, `dump.sql` - Datenbank-Backups

### 📊 Data Files
- `data/oebb/` - Große ÖBB Datensätze
- `data/wiener_linien/` - Rohe Wiener Linien Daten
- `*.xlsx`, `*.xls` - Excel Dateien (meist groß)
- `raw_data/`, `exports/` - Rohdaten und Exporte

### 📝 Logs & Runtime
- `logs/` - Alle Log-Dateien
- `*.log` - Log-Dateien
- `*.pid`, `*.seed` - Process IDs
- `pm2.log` - PM2 Logs

### 👤 User Data
- `user-data/` - Benutzerdaten
- `sessions/` - Session-Dateien
- `uploads/` - Hochgeladene Dateien

## ✅ Was wird versioniert

### 🔧 Konfiguration (Templates)
- `.env.example` - Vorlage für Umgebungsvariablen
- `ecosystem.config.js` - PM2 Konfiguration (ohne Secrets)
- `package.json` - NPM Abhängigkeiten

### 📡 Essential Data
- `wien_opnv_data.json` - Verarbeitete ÖPNV-Daten
- `stations.json` - Haltestellen-Daten
- `lines.json` - Linien-Daten
- `mock-data.js` - Test-Daten

### 📄 Documentation
- `README.md` - Projekt-Dokumentation
- `INSTALL-*.md` - Installationsanleitungen
- `*.md` - Alle Markdown-Dokumentation

### 🎨 Frontend Assets
- `*.html`, `*.css`, `*.js` - Web-Dateien
- `assets/` - Bilder und statische Dateien
- `img/` - Bilder

## 🛡️ Sicherheitsmaßnahmen

### 1. Environment Variables
```bash
# ✅ Gut - In .env.example
SUPABASE_URL=your-supabase-url-here
SUPABASE_ANON_KEY=your-anon-key-here

# ❌ Schlecht - Echte Werte in Code
const SUPABASE_URL = "https://abc123.supabase.co"
```

### 2. API Keys
```javascript
// ✅ Gut - Aus Umgebungsvariablen
const apiKey = process.env.WIENER_LINIEN_API_KEY;

// ❌ Schlecht - Hardcoded
const apiKey = "sk_live_abc123xyz789";
```

### 3. Database URLs
```bash
# ✅ Gut - In .env
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# ❌ Schlecht - In Code
const dbUrl = "postgresql://admin:secret123@prod.example.com:5432/wannfahrma";
```

### 4. SSL Certificates
```bash
# ✅ Gut - Separate Dateien (nicht versioniert)
ssl/
├── cert.pem
├── key.pem
└── ca.pem

# ❌ Schlecht - In Code oder Config
const sslKey = "-----BEGIN PRIVATE KEY-----\nMIIE...";
```

## 🔍 Überprüfung vor Commit

### 1. Manuelle Überprüfung
```bash
# Prüfe auf potentielle Secrets
git diff --cached | grep -i "password\|secret\|key\|token"

# Prüfe .env Dateien
ls -la .env*

# Prüfe große Dateien
find . -size +10M -not -path "./node_modules/*"
```

### 2. Git Hooks (empfohlen)
```bash
# Install pre-commit hook
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/bash
# Check for potential secrets
if git diff --cached | grep -qE "(password|secret|key|token|api_key).*=.*['\"][^'\"]{10,}"; then
    echo "⚠️  Potential secret detected in commit!"
    echo "Please review your changes before committing."
    exit 1
fi
EOF

chmod +x .git/hooks/pre-commit
```

## 🚨 Was tun bei versehentlichem Commit

### 1. Letzter Commit (nicht gepusht)
```bash
# Datei aus letztem Commit entfernen
git reset HEAD~1 -- .env
git commit --amend
```

### 2. Bereits gepusht
```bash
# ⚠️ Vorsicht: Verändert Git Historie
git filter-branch --force --index-filter \
    'git rm --cached --ignore-unmatch .env' \
    --prune-empty --tag-name-filter cat -- --all

# Force push (nur wenn nötig und koordiniert)
git push origin --force --all
```

### 3. Secrets rotieren
- **Sofort** alle exponierten API-Keys ändern
- Neue Zertifikate generieren
- Passwörter ändern
- Team informieren

## 📚 Best Practices

### 1. Entwicklung
- Nutze `.env.example` als Vorlage
- Niemals echte Secrets in Code
- Lokale `.env` Datei nur für Entwicklung

### 2. Production
- Umgebungsvariablen über Server-Konfiguration
- Secrets über sichere Speicher (HashiCorp Vault, AWS Secrets Manager)
- Regelmäßige Rotation von Secrets

### 3. Team
- Secrets nie über Chat/Email teilen
- Sichere Übergabe über Tools wie Bitwarden
- Dokumentation von Secret-Locations

## 🛠️ Tools für Secret Management

### Entwicklung
- **direnv** - Automatisches Laden von .env
- **dotenv** - NPM Package für .env
- **git-secrets** - Verhindert Secret-Commits

### Production
- **HashiCorp Vault** - Secret Management
- **AWS Secrets Manager** - Cloud Secrets
- **Azure Key Vault** - Azure Secrets
- **Google Secret Manager** - Google Cloud Secrets

## 📞 Support

Bei Fragen zur Sicherheit:
1. Prüfe diese Dokumentation
2. Kontaktiere Team-Lead
3. Erstelle Issue im Repository

---

🔒 **Sicherheit ist Teamwork - Jeder ist verantwortlich!**
