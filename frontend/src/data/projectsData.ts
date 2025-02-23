export interface Client {
    id: string;
    name: string;
    shortName: string;
}

export interface Plant {
    id: string;
    clientId: string;
    name: string;
    address: string;
    coordinates: string;
    contact: {
        name: string;
        phone: string;
        email: string;
    };
    defaultHotel: {
        name: string;
        address: string;
        phone: string;
    };
}

export const predefinedClients: Client[] = [
    { id: 'aptiv', name: 'APTIV Cableados', shortName: 'APTIV' },
    { id: 'lear', name: 'Harman International', shortName: 'HARMAN' },
    { id: 'bosch', name: 'Bosch México', shortName: 'BOSCH' },
    { id: 'continental', name: 'Continental Automotive', shortName: 'CONTINENTAL' },
    { id: 'stellantis', name: 'Stellantis', shortName: 'STELLANTIS' },
    { id: 'ford', name: 'Ford México', shortName: 'FORD' },
    { id: 'toyota', name: 'Toyota México', shortName: 'TOYOTA' },
    { id: 'magna', name: 'Magna International', shortName: 'MAGNA' },
];

export const predefinedPlants: Plant[] = [
    {
        id: 'aptiv-zac',
        clientId: 'aptiv',
        name: 'APTIV Planta Zacatecas',
        address: 'Prol Av México 501, Boulevares, Guadalupe, 98612, Zacatecas',
        coordinates: 'https://maps.google.com/?q=22.77932374431193,-102.48588996713129',
        contact: {
            name: 'Ing. Jorge Rodríguez',
            phone: '844-123-4567',
            email: 'jorge.rodriguez@aptiv.com'
        },
        defaultHotel: {
            name: 'Fiesta Inn Zacatecas',
            address: 'Calzada Heroes de Chapultepec km 13 + 200 Col. La escondida, 98160 Zacatecas',
            phone: '+524924914930'
        }
    },
    {
        id: 'harman-qro',
        clientId: 'harman',
        name: 'HARMAN México',
        address: 'Av. Industria Minera 502, Parque Industrial Querétaro, 76215 Querétaro.',
        coordinates: 'https://maps.google.com/?q=20.7166652,-100.4466797',
        contact: {
            name: 'Ing. Maximiliano',
            phone: '444-567-8901',
            email: 'max@harman.com'
        },
        defaultHotel: {
            name: 'StayBridge Suites Querétaro',
            address: 'Carretera Federal San Luis Potosí-Queretaro 10685. Col. El Salitre, 76127 Querétaro',
            phone: '+524421032900'
        }
    },
    {
        id: 'fordhmo',
        clientId: 'ford',
        name: 'Ford Hermosillo',
        address: 'Blvd. Fusión 10-Sur, Parque Industrial Dinatech, 83297 Hermosillo',
        coordinates: 'https://maps.google.com/?q=29.0729673,-110.9559192',
        contact: {
            name: 'Ing. Roberto Méndez',
            phone: '+526622379622',
            email: 'roberto.mendez@ford.com'
        },
        defaultHotel: {
            name: 'Holiday Inn Express & Suites Hermosillo',
            address: 'Blvrd Luis Donaldo Colosio 829, Col. la Rioja, 83224 Hermosillo',
            phone: '+526622102030'
        }
    },
    {
        id: 'toyota-gto',
        clientId: 'toyota',
        name: 'TOYOTA TMMGT',
        address: 'México 45D, 38195 San Pedro Tenango',
        coordinates: 'https://maps.google.com/?q=20.5464259,-101.2115023',
        contact: {
            name: 'Ing. Carlos Vega',
            phone: '442-890-1234',
            email: 'carlos.vega@tmmgt.com'
        },
        defaultHotel: {
            name: 'Holiday Inn Queretaro-Centro Historico',
            address: 'Av. 5 de Febrero 110, Niños Heroes, 76010 Querétaro',
            phone: '+524421920202'
        }
    },
    {
        id: 'stellantis-svap',
        clientId: 'stellantis',
        name: 'SVAP VAN',
        address: 'Carretera a Derramadero Km. 1.5, 25300 Agua Nueva-Saltillo',
        coordinates: 'https://maps.google.com/?q=25.26451592557619, -101.10684709066538',
        contact: {
            name: 'Ing. Eduardo Delgado',
            phone: '442-890-1234',
            email: 'lalo.delgado@stellantis.com'
        },
        defaultHotel: {
            name: 'Hotel One Saltillo Derramadero',
            address: 'Carretera Federal Cepeda No. 8731 Col. El Roble del Sur, 25300 Saltillo',
            phone: '+528449869060'
        }
    },
    {
        id: 'stellantis-stap',
        clientId: 'stellantis',
        name: 'STAP Trucks',
        address: 'Carretera a Derramadero Km. 1.5, 25300 Agua Nueva-Saltillo',
        coordinates: 'https://maps.google.com/?q=25.260889741119808, -101.11377819646471',
        contact: {
            name: 'Ing. José de la Rosa',
            phone: '442-890-1234',
            email: 'jdelarosa@stellantis.com'
        },
        defaultHotel: {
            name: 'Hotel One Saltillo Derramadero',
            address: 'Carretera Federal Cepeda No. 8731 Col. El Roble del Sur, 25300 Saltillo',
            phone: '+528449869060'
        }
    },
    {
        id: 'stellantis-tap',
        clientId: 'stellantis',
        name: 'TAP Toluca',
        address: 'Carr Toluca - México Manzana 013 Km 60.5, Santa Ana Tlapaltitlán, 50160 Toluca',
        coordinates: 'https://maps.google.com/?q=19.28926852948167, -99.60689597732004',
        contact: {
            name: 'Ing. Baruch Quiroz',
            phone: '442-890-1234',
            email: 'baruch.quiroz@stellantis.com'
        },
        defaultHotel: {
            name: 'Holiday Inn Express & Suites Toluca',
            address: 'Paseo Tollocan 818 Col. Santa Ana Tapaltitlan, 50160 Toluca',
            phone: '+527222799999'
        }
    },
    {
        id: 'stellantis-patio',
        clientId: 'stellantis',
        name: 'Patio Comodato Toluca',
        address: 'Av. Industria Automotriz, Santa Ana Tlapaltitlán, 50160 Toluca',
        coordinates: 'https://maps.google.com/?q=19.296523799653826, -99.60099956090761',
        contact: {
            name: 'Ing. Baruch Quiroz',
            phone: '442-890-1234',
            email: 'baruch.quiroz@stellantis.com'
        },
        defaultHotel: {
            name: 'Holiday Inn Express & Suites Toluca',
            address: 'Paseo Tollocan 818 Col. Santa Ana Tapaltitlan, 50160 Toluca',
            phone: '+527222799999'
        }
    }
];

export const predefinedHotels = predefinedPlants.map(plant => ({
    id: plant.id + '-hotel',
    plantId: plant.id,
    ...plant.defaultHotel
})); 