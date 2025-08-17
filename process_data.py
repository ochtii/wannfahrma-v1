#!/usr/bin/env python3
"""
Wien ÖPNV Data Processor
Lädt und verarbeitet die CSV-Daten der Wiener Linien für die Web-Anwendung
"""

import pandas as pd
import json
import os
from pathlib import Path

class WienOPNVDataProcessor:
    def __init__(self, data_dir="data/wiener_linien"):
        self.data_dir = Path(data_dir)
        self.stations_data = None
        self.stops_data = None
        self.lines_data = None
        self.platforms_data = None
        
    def load_csv_data(self):
        """Lädt alle CSV-Dateien"""
        try:
            # Haltestellen (Stationen)
            stations_file = self.data_dir / "wienerlinien-ogd-haltestellen.csv"
            self.stations_data = pd.read_csv(stations_file, sep=';', encoding='utf-8')
            print(f"✓ Haltestellen geladen: {len(self.stations_data)} Einträge")
            
            # Haltepunkte (einzelne Stops mit RBL-Nummern)
            stops_file = self.data_dir / "wienerlinien-ogd-haltepunkte.csv"
            self.stops_data = pd.read_csv(stops_file, sep=';', encoding='utf-8')
            print(f"✓ Haltepunkte geladen: {len(self.stops_data)} Einträge")
            
            # Linien
            lines_file = self.data_dir / "wienerlinien-ogd-linien.csv"
            self.lines_data = pd.read_csv(lines_file, sep=';', encoding='utf-8')
            print(f"✓ Linien geladen: {len(self.lines_data)} Einträge")
            
            # Steige (Platforms)
            platforms_file = self.data_dir / "wienerlinien-ogd-steige.csv"
            self.platforms_data = pd.read_csv(platforms_file, sep=';', encoding='utf-8')
            print(f"✓ Steige geladen: {len(self.platforms_data)} Einträge")
            
        except Exception as e:
            print(f"❌ Fehler beim Laden der CSV-Dateien: {e}")
            return False
        return True
    
    def process_stations_with_rbls(self):
        """
        Verarbeitet Stationen und gruppiert alle RBL-Nummern pro Station
        """
        # Merge Haltestellen mit Haltepunkten über DIVA
        merged_data = pd.merge(
            self.stations_data, 
            self.stops_data, 
            on='DIVA', 
            how='left',
            suffixes=('_station', '_stop')
        )
        
        # Gruppiere nach Station und sammle alle StopIDs (RBL-Nummern)
        grouped_stations = []
        
        for diva, group in merged_data.groupby('DIVA'):
            if pd.isna(diva):
                continue
                
            station_info = group.iloc[0]
            
            # Sammle alle StopIDs für diese Station
            stop_ids = group['StopID'].dropna().astype(str).tolist()
            
            # Hole Platform-Informationen
            platforms = []
            for stop_id in stop_ids:
                platform_info = self.platforms_data[
                    self.platforms_data['StopID'].astype(str) == stop_id
                ]
                if not platform_info.empty:
                    platforms.append({
                        'stopId': stop_id,
                        'platform': platform_info.iloc[0]['Platform']
                    })
            
            station = {
                'diva': str(int(diva)),
                'name': station_info['PlatformText'],
                'municipality': station_info['Municipality_station'],
                'longitude': float(station_info['Longitude_station']) if pd.notna(station_info['Longitude_station']) else None,
                'latitude': float(station_info['Latitude_station']) if pd.notna(station_info['Latitude_station']) else None,
                'rbls': stop_ids,
                'platforms': platforms,
                'rbl_count': len(stop_ids)
            }
            
            grouped_stations.append(station)
        
        # Sortiere nach Namen
        grouped_stations.sort(key=lambda x: x['name'])
        
        print(f"✓ {len(grouped_stations)} Stationen mit RBL-Nummern verarbeitet")
        return grouped_stations
    
    def process_lines_data(self):
        """Verarbeitet Liniendaten"""
        lines = []
        
        for _, line in self.lines_data.iterrows():
            line_type = 'bus'  # Default
            
            # Bestimme Linientyp basierend auf MeansOfTransport
            if line['MeansOfTransport'] == 'ptMetro':
                line_type = 'metro'
            elif line['MeansOfTransport'] == 'ptTram':
                line_type = 'tram'
            elif line['MeansOfTransport'] == 'ptBus':
                line_type = 'bus'
            
            # Farbe basierend auf Typ
            color = '#007bff'  # Bus (blau)
            if line_type == 'metro':
                color = '#dc3545'  # U-Bahn (rot)
            elif line_type == 'tram':
                color = '#dc3545'  # Straßenbahn (rot)
            
            lines.append({
                'lineId': str(line['LineID']),
                'lineText': line['LineText'],
                'type': line_type,
                'color': color,
                'realtime': bool(line['Realtime']) if pd.notna(line['Realtime']) else False
            })
        
        print(f"✓ {len(lines)} Linien verarbeitet")
        return lines
    
    def export_to_json(self, stations, lines, output_dir=""):
        """Exportiert die verarbeiteten Daten als JSON für die Web-App"""
        try:
            # Stationen exportieren
            stations_file = Path(output_dir) / "stations.json"
            with open(stations_file, 'w', encoding='utf-8') as f:
                json.dump(stations, f, ensure_ascii=False, indent=2)
            print(f"✓ Stationen exportiert: {stations_file}")
            
            # Linien exportieren
            lines_file = Path(output_dir) / "lines.json"
            with open(lines_file, 'w', encoding='utf-8') as f:
                json.dump(lines, f, ensure_ascii=False, indent=2)
            print(f"✓ Linien exportiert: {lines_file}")
            
            # Kombinierte Datei für die Web-App
            combined_data = {
                'stations': stations,
                'lines': lines,
                'lastUpdated': pd.Timestamp.now().isoformat()
            }
            
            combined_file = Path(output_dir) / "wien_opnv_data.json"
            with open(combined_file, 'w', encoding='utf-8') as f:
                json.dump(combined_data, f, ensure_ascii=False, indent=2)
            print(f"✓ Kombinierte Daten exportiert: {combined_file}")
            
        except Exception as e:
            print(f"❌ Fehler beim Exportieren: {e}")
            return False
        return True
    
    def generate_statistics(self, stations, lines):
        """Generiert Statistiken über die Daten"""
        total_rbls = sum(len(station['rbls']) for station in stations)
        
        line_types = {}
        for line in lines:
            line_type = line['type']
            line_types[line_type] = line_types.get(line_type, 0) + 1
        
        print("\n📊 STATISTIKEN:")
        print(f"   • Stationen gesamt: {len(stations)}")
        print(f"   • RBL-Nummern gesamt: {total_rbls}")
        print(f"   • Durchschnittliche RBLs pro Station: {total_rbls/len(stations):.1f}")
        print(f"   • Linien gesamt: {len(lines)}")
        for line_type, count in line_types.items():
            print(f"     - {line_type.title()}: {count}")
        
        # Top Stationen mit den meisten RBLs
        top_stations = sorted(stations, key=lambda x: x['rbl_count'], reverse=True)[:5]
        print(f"\n🏆 TOP STATIONEN (meiste RBL-Nummern):")
        for i, station in enumerate(top_stations, 1):
            print(f"   {i}. {station['name']}: {station['rbl_count']} RBLs")
    
    def run(self):
        """Hauptmethode - führt den kompletten Verarbeitungsprozess aus"""
        print("🚇 Wien ÖPNV Data Processor")
        print("=" * 50)
        
        # CSV-Daten laden
        if not self.load_csv_data():
            return False
        
        print("\n🔄 Verarbeite Daten...")
        
        # Stationen mit RBLs verarbeiten
        stations = self.process_stations_with_rbls()
        
        # Linien verarbeiten
        lines = self.process_lines_data()
        
        # JSON exportieren
        if self.export_to_json(stations, lines):
            print("\n✅ Datenverarbeitung erfolgreich abgeschlossen!")
        
        # Statistiken anzeigen
        self.generate_statistics(stations, lines)
        
        return True

def main():
    processor = WienOPNVDataProcessor()
    processor.run()

if __name__ == "__main__":
    main()
