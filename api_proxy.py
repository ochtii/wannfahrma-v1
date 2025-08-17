#!/usr/bin/env python3
"""
Wien ÖPNV API Proxy Server
Löst CORS-Probleme beim direkten Zugriff auf die Wiener Linien API
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import json
from urllib.error import URLError, HTTPError

class WienerLinienProxy(BaseHTTPRequestHandler):
    
    def do_GET(self):
        # CORS Headers setzen
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        # Parse URL Parameter
        parsed_url = urllib.parse.urlparse(self.path)
        query_params = urllib.parse.parse_qs(parsed_url.query)
        
        if parsed_url.path == '/monitor' and 'rbl' in query_params:
            rbl = query_params['rbl'][0]
            self.fetch_wiener_linien_data(rbl)
        else:
            self.send_error_response('Invalid endpoint')
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def fetch_wiener_linien_data(self, rbl):
        try:
            # Wiener Linien API URL
            api_url = f"https://www.wienerlinien.at/ogd_realtime/monitor?rbl={rbl}&activateTrafficInfo=stoerungkurz&activateTrafficInfo=stoerunglang"
            
            # API-Anfrage
            with urllib.request.urlopen(api_url) as response:
                data = response.read().decode('utf-8')
                
            # JSON validieren
            json_data = json.loads(data)
            
            # Erfolgreiche Antwort
            self.wfile.write(data.encode('utf-8'))
            print(f"✓ Erfolgreich Daten für RBL {rbl} abgerufen")
            
        except HTTPError as e:
            print(f"❌ HTTP-Fehler für RBL {rbl}: {e.code}")
            self.send_error_response(f"API HTTP Error: {e.code}")
        except URLError as e:
            print(f"❌ URL-Fehler für RBL {rbl}: {e.reason}")
            self.send_error_response(f"API URL Error: {e.reason}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON-Fehler für RBL {rbl}: {e}")
            self.send_error_response("Invalid JSON response")
        except Exception as e:
            print(f"❌ Unbekannter Fehler für RBL {rbl}: {e}")
            self.send_error_response(f"Unexpected error: {str(e)}")
    
    def send_error_response(self, message):
        error_data = {
            "error": True,
            "message": message,
            "data": None
        }
        self.wfile.write(json.dumps(error_data).encode('utf-8'))
    
    def log_message(self, format, *args):
        # Reduziere Log-Output
        pass

def start_proxy_server(port=3001):
    server_address = ('localhost', port)
    httpd = HTTPServer(server_address, WienerLinienProxy)
    
    print(f"🚇 Wien ÖPNV API Proxy Server gestartet")
    print(f"📡 Läuft auf: http://localhost:{port}")
    print(f"🔗 Verwendung: http://localhost:{port}/monitor?rbl=<RBL_NUMMER>")
    print(f"⚡ CORS-Probleme werden automatisch gelöst")
    print("=" * 60)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server gestoppt")
        httpd.shutdown()

if __name__ == "__main__":
    start_proxy_server()
