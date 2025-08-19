# Authentication & Supabase Setup Guide

## 🎯 **Funktionsübersicht**

### ✅ **Implementierte Features:**
- **Login/Register Formulare** mit modernem UI
- **Supabase Integration** für Authentication, Database & Storage  
- **Automatische Datenmigration** von Local Storage zu User Account
- **Usage Limits** für nicht-angemeldete Nutzer:
  - Maximal **1 Dashboard-Karte**
  - Maximal **5 Abfahrtslinien** pro Karte
- **Unbegrenzte Nutzung** für registrierte User
- **Persistente Datenspeicherung** in Supabase Database

## 🔧 **Supabase Setup**

### 1. **Supabase Projekt erstellen**
1. Gehen Sie zu [supabase.com](https://supabase.com)
2. Erstellen Sie einen neuen Account oder loggen Sie sich ein
3. Klicken Sie auf "New Project"
4. Wählen Sie einen Projektnamen (z.B. "wannfahrma-v1")
5. Wählen Sie eine Region (Europa empfohlen)
6. Setzen Sie ein sicheres Datenbankpasswort

### 2. **Konfiguration eintragen**
Öffnen Sie `supabase-config.js` und ersetzen Sie:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

**So finden Sie Ihre Credentials:**
1. Gehen Sie zu Ihrem Supabase Dashboard
2. Klicken Sie auf "Settings" → "API"  
3. Kopieren Sie die **Project URL** und den **anon public key**

### 3. **Datenbank Schema erstellen**
1. Öffnen Sie Ihr Supabase Dashboard
2. Gehen Sie zu "SQL Editor"
3. Kopieren Sie den Inhalt aus `supabase-schema.sql`
4. Führen Sie das SQL aus

## 📊 **Database Schema**

Das Schema erstellt diese Tabellen:

### **user_dashboard_cards**
- Speichert Dashboard-Karten pro User
- RLS (Row Level Security) aktiviert
- User können nur ihre eigenen Karten sehen/bearbeiten

### **user_settings** 
- App-Einstellungen pro User
- JSON-Format für flexible Einstellungen

### **user_profiles**
- Erweiterte User-Profile (optional)
- Display Name, Avatar, Preferences

## 🚀 **Funktionsweise**

### **Ohne Anmeldung (Gast-Modus):**
- Daten werden im **Local Storage** gespeichert
- **Limits**: 1 Karte, 5 Linien pro Karte  
- **Warning-Banner** zeigt Limits an
- **Registration-Button** prominentangezeigt

### **Mit Anmeldung:**
- Daten werden in **Supabase Database** gespeichert
- **Unbegrenzte** Karten und Linien
- **Cross-Device Sync** automatisch
- **Datenmigration** bei Erstregistrierung

### **Datenmigration:**
Bei der Registrierung wird automatisch gefragt:
- ✅ "Meine lokalen Daten übernehmen" (Standard: aktiv)
- Alle Local Storage Karten → Supabase Database
- Local Storage wird nach Migration geleert

## 🎨 **UI/UX Features**

### **Auth Header**
- **Gast-Status**: Zeigt Limits ("1 Karte, 5 Linien")
- **User-Status**: Zeigt E-Mail + "Unlimited" Badge  
- **Login/Register Buttons** prominent platziert

### **Usage Warnings**
- **Rote Warning-Bar** wenn Limits erreicht
- **Proaktive Hinweise** beim Hinzufügen von Karten/Linien
- **Call-to-Action** zur Registrierung

### **Modals & Forms**
- **Moderne Modal-Dialoge** für Auth
- **Validierung** (E-Mail, Passwort-Stärke, Bestätigung)
- **Error/Success Notifications** mit Auto-Dismiss
- **Passwort vergessen** Funktion

## 🔒 **Security Features**

### **Row Level Security (RLS)**
- User können nur ihre eigenen Daten zugreifen
- Automatische User-ID Zuordnung
- Schutz vor unautorisierten Zugriffen

### **Authentication**
- **E-Mail Verification** (optional konfigurierbar)
- **Password Reset** via E-Mail
- **Session Management** automatisch
- **Auto-Login** nach Registration

## 🧪 **Testen ohne Supabase**

Für lokale Entwicklung ohne Supabase:
1. Lassen Sie die Standard-URLs in `supabase-config.js`
2. Die App erkennt fehlende Supabase-Verbindung
3. Alle Daten werden im Local Storage gespeichert
4. Auth-UI ist sichtbar aber deaktiviert

## 📱 **Usage Limits Implementation**

```javascript
// Limit Check vor neuen Karten
if (!this.auth.isLoggedIn) {
    const cards = localStorage.getItem('wien_opnv_dashboard_cards');
    if (cards.length >= 1) {
        showWarning('Limit erreicht - Bitte registrieren');
        return;
    }
}

// Limit Check für Abfahrtslinien  
if (!this.auth.isLoggedIn && departureLines.length > 5) {
    showWarning('Maximal 5 Linien ohne Anmeldung');
    return;
}
```

## 🎉 **Nächste Schritte**

1. **Supabase Projekt erstellen** (5 Minuten)
2. **Credentials eintragen** in `supabase-config.js`
3. **Database Schema ausführen** via SQL Editor
4. **App testen** mit Registration/Login
5. **E-Mail Provider konfigurieren** (optional)

Die Authentication ist vollständig implementiert und ready-to-use! 🚀
