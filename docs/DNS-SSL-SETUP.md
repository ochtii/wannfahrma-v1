# 🌐 DNS & SSL Setup Guide

Schritt-für-Schritt Anleitung für Domain und SSL-Konfiguration.

## 📋 Überblick

**Problem**: Let's Encrypt SSL schlägt fehl mit DNS-Fehlern
**Lösung**: Korrekte DNS-Konfiguration vor SSL-Installation

## 🎯 Voraussetzungen

### Was Sie benötigen:
- ✅ Registrierte Domain (z.B. `wartenis.org`)
- ✅ Ubuntu Server mit öffentlicher IP
- ✅ Zugang zu DNS-Management Ihres Domain-Providers

## 🔧 Schritt 1: Server IP ermitteln

```bash
# Öffentliche IP des Servers herausfinden
curl ifconfig.me
# oder
curl ipinfo.io/ip
# oder
ip addr show | grep 'inet.*global'

# Beispiel-Output: 185.199.108.123
```

## 🌐 Schritt 2: DNS A-Record erstellen

### Bei Ihrem Domain-Provider (z.B. Namecheap, GoDaddy, Cloudflare):

```
Type: A
Name: @ (für wartenis.org)
Value: 185.199.108.123 (Ihre Server-IP)
TTL: 300 (5 Minuten)
```

### Für Subdomain (z.B. app.wartenis.org):
```
Type: A  
Name: app
Value: 185.199.108.123
TTL: 300
```

### Provider-spezifische Anleitungen:

#### **Namecheap**
1. Domain Dashboard → Advanced DNS
2. "Add New Record"
3. Type: A Record, Host: @, Value: SERVER-IP

#### **GoDaddy** 
1. DNS Management → DNS Records
2. "Add" → A → Name: @, Points to: SERVER-IP

#### **Cloudflare**
1. DNS → Records → Add record
2. Type: A, Name: @, IPv4: SERVER-IP, Proxy: Grey Cloud

## ✅ Schritt 3: DNS Propagation prüfen

### Sofort-Tests:
```bash
# DNS A-Record prüfen
dig A wartenis.org
nslookup wartenis.org

# Erwarteter Output:
# wartenis.org.    300    IN    A    185.199.108.123
```

### Online-Tools:
- **whatsmydns.net** - Globale DNS-Propagation
- **dnschecker.org** - Worldwide DNS Check
- **mxtoolbox.com** - DNS Lookup Tools

### DNS Cache leeren (falls alte Einträge):
```bash
# Linux
sudo systemctl flush-dns
sudo systemd-resolve --flush-caches

# Windows
ipconfig /flushdns

# macOS  
sudo dscacheutil -flushcache
```

## 🔒 Schritt 4: HTTP-Erreichbarkeit testen

```bash
# Test ob Server über Domain erreichbar ist
curl -I http://wartenis.org
curl -v http://wartenis.org

# Erwartete Response:
# HTTP/1.1 200 OK
# Server: nginx
```

## 🛡️ Schritt 5: SSL-Zertifikat erstellen

### Automatisch (via install-ubuntu.sh):
Das Script macht jetzt automatisch DNS-Validierung vor SSL-Installation.

### Manuell:
```bash
# Dry-run (Test ohne Zertifikat)
sudo certbot --nginx -d wartenis.org --dry-run

# Echtes Zertifikat erstellen
sudo certbot --nginx -d wartenis.org

# Mit E-Mail
sudo certbot --nginx -d wartenis.org --email ihre@email.com --agree-tos --non-interactive
```

## 🔍 Troubleshooting

### Problem: "NXDOMAIN looking up A"
```bash
# Diagnose
dig A wartenis.org
# Keine Antwort = DNS A-Record fehlt

# Lösung
# 1. DNS A-Record erstellen (siehe Schritt 2)
# 2. 15-60 Minuten warten (DNS Propagation)
# 3. Erneut testen
```

### Problem: "DNS points to wrong IP"
```bash
# Diagnose
dig A wartenis.org +short
# zeigt: 1.2.3.4 (andere IP als Server)

# Lösung
# 1. A-Record korrigieren auf richtige Server-IP
# 2. TTL reduzieren (300 Sekunden)
# 3. Cache leeren und warten
```

### Problem: "Connection refused"
```bash
# Diagnose  
curl -v http://wartenis.org
# Fehler: Connection refused

# Mögliche Ursachen & Lösungen:
# 1. Nginx läuft nicht
sudo systemctl start nginx
sudo systemctl status nginx

# 2. Firewall blockiert
sudo ufw allow 80
sudo ufw allow 443
sudo ufw status

# 3. Nginx Konfiguration falsch
sudo nginx -t
sudo nginx -s reload
```

### Problem: "Certificate already exists"
```bash
# Bestehende Zertifikate anzeigen
sudo certbot certificates

# Zertifikat erneuern
sudo certbot renew --dry-run
sudo certbot renew

# Zertifikat löschen und neu erstellen
sudo certbot delete --cert-name wartenis.org
sudo certbot --nginx -d wartenis.org
```

## ⏱️ DNS Propagation Zeiten

| Provider | Typische Zeit | Maximum |
|----------|---------------|---------|
| Cloudflare | 1-5 Minuten | 30 Minuten |
| Namecheap | 30 Minuten | 24 Stunden |
| GoDaddy | 1 Stunde | 48 Stunden |
| Standard DNS | 4-8 Stunden | 72 Stunden |

**Tipp**: TTL auf 300 (5 Minuten) setzen für schnellere Updates!

## 🚀 Nach erfolgreicher SSL-Installation

### Automatische Erneuerung testen:
```bash
# Timer Status prüfen
sudo systemctl status certbot.timer

# Manuelle Erneuerung testen
sudo certbot renew --dry-run

# Nginx reload nach Erneuerung
sudo systemctl reload nginx
```

### HTTPS-Redirect aktivieren:
```bash
# Prüfen ob HTTP → HTTPS Weiterleitung funktioniert
curl -I http://wartenis.org
# Sollte zeigen: 301 Moved Permanently
# Location: https://wartenis.org

# Test HTTPS
curl -I https://wartenis.org
# Sollte zeigen: 200 OK
```

## 📞 Support

### Bei anhaltenden Problemen:

1. **DNS-Provider Support** - bei DNS-Konfigurationsproblemen
2. **Let's Encrypt Community** - https://community.letsencrypt.org
3. **Nginx Documentation** - für Webserver-Konfiguration
4. **Certbot Documentation** - https://certbot.eff.org/docs/

### Debug-Logs:
```bash
# Certbot Logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Nginx Logs  
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# System Logs
sudo journalctl -u nginx -f
```

---

✅ **Erfolg**: Nach korrekter DNS-Konfiguration sollte SSL-Installation problemlos funktionieren!

🔒 **Sicherheit**: Let's Encrypt Zertifikate erneuern sich automatisch alle 60 Tage.
