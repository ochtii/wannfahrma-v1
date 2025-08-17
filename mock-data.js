// Mock-Daten für die Entwicklung wenn die API nicht verfügbar ist
const mockDepartures = {
    data: {
        monitors: [{
            locationStop: {
                type: 'stop',
                geometry: {
                    type: 'Point',
                    coordinates: [16.3738, 48.2082]
                },
                properties: {
                    name: 'Stephansplatz',
                    title: 'Stephansplatz',
                    municipality: 'Wien',
                    municipalityId: 90001,
                    type: 'stop',
                    coordName: 'WGS84',
                    gate: 'U',
                    attributes: {}
                }
            },
            lines: [{
                name: 'U1',
                towards: 'Leopoldau',
                direction: 'H',
                platform: null,
                richtungsId: '1',
                barrierFree: true,
                realtimeSupported: true,
                trafficjam: false,
                departures: {
                    departure: [{
                        departureTime: {
                            timePlanned: '2025-08-17T19:25:00.000+0200',
                            timeReal: '2025-08-17T19:26:00.000+0200',
                            countdown: 4
                        },
                        vehicle: {
                            name: 'U1',
                            towards: 'Leopoldau',
                            direction: 'H',
                            richtungsId: '1',
                            barrierFree: true,
                            realtimeSupported: true,
                            trafficjam: false,
                            type: 'ptMetro',
                            attributes: {},
                            linienId: 301
                        }
                    }, {
                        departureTime: {
                            timePlanned: '2025-08-17T19:28:00.000+0200',
                            timeReal: '2025-08-17T19:28:00.000+0200',
                            countdown: 7
                        },
                        vehicle: {
                            name: 'U1',
                            towards: 'Leopoldau',
                            direction: 'H',
                            richtungsId: '1',
                            barrierFree: true,
                            realtimeSupported: true,
                            trafficjam: false,
                            type: 'ptMetro',
                            attributes: {},
                            linienId: 301
                        }
                    }]
                }
            }, {
                name: 'U3',
                towards: 'Simmering',
                direction: 'H',
                platform: null,
                richtungsId: '1',
                barrierFree: true,
                realtimeSupported: true,
                trafficjam: false,
                departures: {
                    departure: [{
                        departureTime: {
                            timePlanned: '2025-08-17T19:24:00.000+0200',
                            timeReal: '2025-08-17T19:24:00.000+0200',
                            countdown: 3
                        },
                        vehicle: {
                            name: 'U3',
                            towards: 'Simmering',
                            direction: 'H',
                            richtungsId: '1',
                            barrierFree: true,
                            realtimeSupported: true,
                            trafficjam: false,
                            type: 'ptMetro',
                            attributes: {},
                            linienId: 303
                        }
                    }]
                }
            }]
        }],
        message: {
            value: 'OK',
            messageCode: 1,
            serverTime: '2025-08-17T19:21:00+0200'
        }
    }
};

function generateMockDeparture(line, type, towards, countdown) {
    const lineColors = {
        'U1': '#E20A16',
        'U2': '#A05EB0', 
        'U3': '#FF7F00',
        'U4': '#109240',
        'U6': '#B5622D',
        '1': '#fd7e14',
        '2': '#fd7e14',
        '6': '#fd7e14',
        '13A': '#6c757d',
        '57A': '#6c757d'
    };

    return {
        departureTime: {
            timePlanned: new Date(Date.now() + countdown * 60000).toISOString(),
            timeReal: new Date(Date.now() + countdown * 60000).toISOString(),
            countdown: countdown
        },
        vehicle: {
            name: line,
            towards: towards,
            direction: 'H',
            richtungsId: '1',
            barrierFree: true,
            realtimeSupported: true,
            trafficjam: false,
            type: type,
            attributes: {},
            linienId: parseInt(line.replace(/[^0-9]/g, '')) || 999
        }
    };
}

function getMockData(rbl) {
    // Verschiedene Mock-Daten basierend auf RBL
    const mockStations = {
        '1120': {
            name: 'Stephansplatz',
            lines: [
                { name: 'U1', type: 'ptMetro', towards: 'Leopoldau', departures: [2, 6, 10] },
                { name: 'U3', type: 'ptMetro', towards: 'Simmering', departures: [1, 5, 9] }
            ]
        },
        '2172': {
            name: 'Schwedenplatz',
            lines: [
                { name: 'U1', type: 'ptMetro', towards: 'Oberlaa', departures: [3, 7, 11] },
                { name: 'U4', type: 'ptMetro', towards: 'Hütteldorf', departures: [4, 8, 12] }
            ]
        },
        '4646': {
            name: 'Karlsplatz',
            lines: [
                { name: 'U1', type: 'ptMetro', towards: 'Leopoldau', departures: [1, 4, 8] },
                { name: 'U2', type: 'ptMetro', towards: 'Seestadt', departures: [2, 6, 10] },
                { name: 'U4', type: 'ptMetro', towards: 'Heiligenstadt', departures: [3, 7, 11] },
                { name: '1', type: 'ptTram', towards: 'Prater Hauptallee', departures: [5, 12] },
                { name: '2', type: 'ptTram', towards: 'Friedrich-Engels-Platz', departures: [4, 14] },
                { name: '13A', type: 'ptBusCity', towards: 'Alser Straße', departures: [6, 16] },
                { name: '57A', type: 'ptBusCity', towards: 'Rudolfsheim', departures: [8, 18] }
            ]
        },
        'default': {
            name: 'Mixed Teststation',
            lines: [
                { name: 'U6', type: 'ptMetro', towards: 'Floridsdorf', departures: [2, 8, 14] },
                { name: '6', type: 'ptTram', towards: 'Burggasse-Stadthalle', departures: [3, 9] },
                { name: '48A', type: 'ptBusCity', towards: 'Baumgarten', departures: [5, 15] }
            ]
        }
    };

    const station = mockStations[rbl] || mockStations.default;
    
    const monitors = [{
        locationStop: {
            type: 'stop',
            geometry: {
                type: 'Point',
                coordinates: [16.3738, 48.2082]
            },
            properties: {
                name: station.name,
                title: station.name,
                municipality: 'Wien',
                municipalityId: 90001,
                type: 'stop',
                coordName: 'WGS84',
                gate: 'U',
                attributes: {}
            }
        },
        lines: station.lines.map(line => ({
            name: line.name,
            towards: line.towards,
            direction: 'H',
            platform: null,
            richtungsId: '1',
            barrierFree: true,
            realtimeSupported: true,
            trafficjam: false,
            departures: {
                departure: line.departures.map(countdown => 
                    generateMockDeparture(line.name, line.type, line.towards, countdown)
                )
            }
        }))
    }];

    return {
        data: {
            monitors: monitors,
            message: {
                value: 'OK (Mock Data)',
                messageCode: 1,
                serverTime: new Date().toISOString()
            }
        }
    };
}

module.exports = { getMockData };
