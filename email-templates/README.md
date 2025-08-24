# 📧 E-Mail Templates für WannFahrma

Dieses Verzeichnis enthält die benutzerdefinierten E-Mail-Vorlagen für das Supabase-Authentifizierungssystem.

## 📁 Template-Dateien

### Registrierungsbestätigung
- `signup-confirmation.html` - HTML-Version der Bestätigungs-E-Mail
- `signup-confirmation.txt` - Text-Version der Bestätigungs-E-Mail

### Passwort zurücksetzen
- `password-reset.html` - HTML-Version der Password-Reset-E-Mail
- `password-reset.txt` - Text-Version der Password-Reset-E-Mail

## 🔧 Supabase-Konfiguration

Um diese Templates zu verwenden, müssen sie im **Supabase Dashboard** hochgeladen werden:

### 1. Zum Supabase Dashboard gehen
```
https://supabase.com/dashboard/project/wjzfcanojeauhjpgaydg/auth/templates
```

### 2. E-Mail-Templates konfigurieren

#### Registrierungsbestätigung:
- **Template Typ**: `Confirm signup`
- **Subject**: `🚇 Willkommen bei WannFahrma - E-Mail bestätigen`
- **HTML Body**: Inhalt von `signup-confirmation.html` kopieren
- **Text Body**: Inhalt von `signup-confirmation.txt` kopieren

#### Passwort zurücksetzen:
- **Template Typ**: `Reset password`
- **Subject**: `🔐 WannFahrma - Passwort zurücksetzen`
- **HTML Body**: Inhalt von `password-reset.html` kopieren
- **Text Body**: Inhalt von `password-reset.txt` kopieren

## 🎨 Design-Features

### HTML-Templates:
- ✅ **Responsive Design** - funktioniert auf allen Geräten
- ✅ **Moderne Styling** - professionelles Aussehen
- ✅ **Brand-Consistent** - WannFahrma Corporate Design
- ✅ **Call-to-Action Buttons** - auffällige Bestätigungs-Buttons
- ✅ **Sicherheitshinweise** - wichtige Informationen hervorgehoben
- ✅ **Fallback-Links** - für Clients die keine Buttons unterstützen

### Text-Templates:
- ✅ **Emoji-Akzente** - auch in Plaintext ansprechend
- ✅ **Strukturiert** - klare Gliederung mit Überschriften
- ✅ **Vollständige Information** - alle wichtigen Details enthalten

## 🔄 Template-Variablen

Die folgenden Supabase-Variablen werden in den Templates verwendet:

- `{{ .ConfirmationURL }}` - Der Link zur E-Mail-Bestätigung/Password-Reset
- `{{ .SiteURL }}` - Die Basis-URL der Website (falls benötigt)
- `{{ .Email }}` - E-Mail-Adresse des Users (falls benötigt)

## 📱 User Experience

### Registrierung:
1. User registriert sich
2. **Professionelle E-Mail** wird versendet
3. **Ein Klick** zur Bestätigung
4. **Automatische Weiterleitung** zur App
5. **Sofortige Anmeldung** nach Bestätigung

### Passwort-Reset:
1. User klickt "Passwort vergessen"
2. **Sichere E-Mail** mit Reset-Link
3. **Ein Klick** zum Passwort-Reset
4. **Sichere Weiterleitung** zur App
5. **Neues Passwort** setzen

## 🔐 Sicherheit

- ⏰ **Zeitbegrenzte Links** (1 Stunde für Password-Reset)
- 🔒 **Einmalige Verwendung** aller Links
- 🛡️ **Sicherheitshinweise** in jeder E-Mail
- 📧 **Fallback-Optionen** bei technischen Problemen

## 🎯 Nächste Schritte

1. **Templates ins Supabase Dashboard kopieren**
2. **Redirect URLs konfigurieren** (siehe README.md)
3. **Testen** mit Testregistrierung
4. **Live gehen** 🚀
