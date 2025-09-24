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
        coordinates: string;
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
    { id: 'panasonic', name: 'Panasonic', shortName: 'Panasonic' },
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
            phone: '+524924914930',
            coordinates: 'https://maps.google.com/?q=22.776174060168366, -102.607477374995'
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
            phone: '+524421032900',
            coordinates: 'https://maps.google.com/?q=20.66322570887577, -100.43348470494229'
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
            phone: '+526622102030',
            coordinates: 'https://maps.google.com/?q=29.082797750384717, -111.01313662848756'
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
            phone: '+524421920202',
            coordinates: 'https://maps.google.com/?q=20.584836563110837, -100.40953837055868'
        }
    },
    {
        id: 'stellantis-svap',
        clientId: 'stellantis',
        name: 'SVAP VAN',
        address: 'Carretera a Derramadero Km. 1.5, 25300 Saltillo',
        coordinates: 'https://maps.google.com/?q=25.26451592557619, -101.10684709066538',
        contact: {
            name: 'Ing. Eduardo Delgado',
            phone: '442-890-1234',
            email: 'lalo.delgado@stellantis.com'
        },
        defaultHotel: {
            name: 'Hotel One Saltillo Derramadero',
            address: 'Carretera Federal Cepeda No. 8731 Col. El Roble del Sur, 25300 Saltillo',
            phone: '+528449869060',
            coordinates: 'https://maps.google.com/?q=25.241870748190834, -101.17335254712948'
        }
    },
    {
        id: 'stellantis-stap',
        clientId: 'stellantis',
        name: 'STAP Trucks',
        address: 'Carretera a Derramadero Km. 2.0, 25300 Saltillo',
        coordinates: 'https://maps.google.com/?q=25.260889741119808, -101.11377819646471',
        contact: {
            name: 'Ing. José de la Rosa',
            phone: '442-890-1234',
            email: 'jdelarosa@stellantis.com'
        },
        defaultHotel: {
            name: 'Hotel One Saltillo Derramadero',
            address: 'Carretera Federal Cepeda No. 8731 Col. El Roble del Sur, 25300 Saltillo',
            phone: '+528449869060',
            coordinates: 'https://maps.google.com/?q=25.241870748190834, -101.17335254712948'
        }
    },
    {
        id: 'stellantis-tap',
        clientId: 'stellantis',
        name: 'TAP Toluca',
        address: 'Carr Toluca - México Manzana 013 Km 60.5, Col. Santa Ana Tlapaltitlán, 50160 Toluca',
        coordinates: 'https://maps.google.com/?q=19.28926852948167, -99.60689597732004',
        contact: {
            name: 'Ing. Baruch Quiroz',
            phone: '442-890-1234',
            email: 'baruch.quiroz@stellantis.com'
        },
        defaultHotel: {
            name: 'Holiday Inn Express & Suites Toluca',
            address: 'Paseo Tollocan 818 Col. Santa Ana Tapaltitlan, 50160 Toluca',
            phone: '+527222799999',
            coordinates: 'https://maps.google.com/?q=19.290959387555482, -99.62466485663106'
        }
    },
    {
        id: 'stellantis-patio',
        clientId: 'stellantis',
        name: 'Patio Comodato Toluca',
        address: 'Av. Industria Automotriz, Col. Santa Ana Tlapaltitlán, 50160 Toluca',
        coordinates: 'https://maps.google.com/?q=19.296523799653826, -99.60099956090761',
        contact: {
            name: 'Ing. Baruch Quiroz',
            phone: '442-890-1234',
            email: 'baruch.quiroz@stellantis.com'
        },
        defaultHotel: {
            name: 'Holiday Inn Express & Suites Toluca',
            address: 'Paseo Tollocan 818 Col. Santa Ana Tapaltitlan, 50160 Toluca',
            phone: '+527222799999',
            coordinates: 'https://maps.google.com/?q=19.290959387555482, -99.62466485663106'
        }
    },
    {
        id: 'panasonic-toluca',
        clientId: 'panasonic',
        name: 'Panasonic Toluca',
        address: 'Carretera Toluca - Naucalpan Km 12.5, Col. San Antonio Buenavista, 50010 Toluca, Estado de México',
        coordinates: 'https://maps.google.com/?q=19.29890963741451,-99.6054586068734',
        contact: {
            name: 'Ing. Carlos Mendoza',
            phone: '722-345-6789',
            email: 'carlos.mendoza@panasonic.com'
        },
        defaultHotel: {
            name: 'Holiday Inn Toluca',
            address: 'Av. Independencia 100, Centro, 50000 Toluca, Estado de México',
            phone: '+527222123456',
            coordinates: 'https://maps.google.com/?q=19.290959387555482, -99.62466485663106'
        }
    }
];

export const predefinedHotels = predefinedPlants.map(plant => ({
    id: plant.id + '-hotel',
    plantId: plant.id,
    ...plant.defaultHotel
}));

export const cityImages = {
    'Guadalupe': '/images/cities/guadalupe.jpg',
    'Querétaro': '/images/cities/queretaro.jpg',
    'Hermosillo': '/images/cities/hermosillo.jpg',
    'Saltillo': '/images/cities/saltillo.jpg',
    'San Pedro Tenango': '/images/cities/san-pedro-tenango.jpg',
    'Toluca': '/images/cities/toluca.jpg',
    'Detroit': '/images/cities/detroit.jpg',
    'Tijuana': '/images/cities/tijuana.jpg',
    'Midlothian': '/images/cities/midlothian.jpg',
    'default': '/images/cities/default-city.jpg'
} as const;

export type HotelImageMap = {
    'Fiesta Inn Zacatecas': {
        thumbnail: string;
        full: string;
    };
    'StayBridge Suites Querétaro': {
        thumbnail: string;
        full: string;
    };
    'Holiday Inn Express & Suites Hermosillo': {
        thumbnail: string;
        full: string;
    };
    'Holiday Inn Queretaro-Centro Historico': {
        thumbnail: string;
        full: string;
    };
    'Hotel One Saltillo Derramadero': {
        thumbnail: string;
        full: string;
    };
    'Holiday Inn Express & Suites Toluca': {
        thumbnail: string;
        full: string;
    };
    default: {
        thumbnail: string;
        full: string;
    };
};

export const hotelImages: HotelImageMap = {
    'Fiesta Inn Zacatecas': {
        thumbnail: '/images/hotels/fiesta-inn.jpg',
        full: '/images/hotels/fiesta-inn.jpg'
    },
    'StayBridge Suites Querétaro': {
        thumbnail: '/images/hotels/stayqro.jpg',
        full: '/images/hotels/stayqro.jpg'
    },
    'Holiday Inn Express & Suites Hermosillo': {
        thumbnail: '/images/hotels/holidayhmo.jpg',
        full: '/images/hotels/holidayhmo.jpg'
    },
    'Holiday Inn Queretaro-Centro Historico': {
        thumbnail: '/images/hotels/holidaycentro.jpg',
        full: '/images/hotels/holidaycentro.jpg'
    },
    'Hotel One Saltillo Derramadero': {
        thumbnail: '/images/hotels/onesaltillo.jpg',
        full: '/images/hotels/onesaltillo.jpg'
    },
    'Holiday Inn Express & Suites Toluca': {
        thumbnail: '/images/hotels/holidaytoluca.jpg',
        full: '/images/hotels/holidaytoluca.jpg'
    },
    default: {
        thumbnail: '/images/hotels/fiesta-inn.jpg',
        full: '/images/hotels/fiesta-inn.jpg'
    }
};

// Crear el caché a nivel de módulo
const cityCache = new Map<string, string>();

export const getCityFromAddress = (address: string): string => {
    console.log('\n=== City Detection Debug ===');
    console.log('Input address:', address);
    
    if (!address || typeof address !== 'string') {
        console.log('Invalid address, returning default');
        console.log('=== End Debug ===\n');
        return 'default';
    }
    
    const addressLower = address.toLowerCase().trim();
    console.log('Normalized address:', addressLower);
    
    // Verificar cache
    if (cityCache.has(addressLower)) {
        const cachedCity = cityCache.get(addressLower);
        console.log('Found in cache:', cachedCity);
        console.log('=== End Debug ===\n');
        return cachedCity || 'default';
    }
    
    // Lista de ciudades que queremos detectar
    const cities = {
        'guadalupe': 'Guadalupe',
        'querétaro': 'Querétaro',
        'hermosillo': 'Hermosillo',
        'saltillo': 'Saltillo',
        'san pedro tenango': 'San Pedro Tenango',
        'toluca': 'Toluca',
        'zacatecas': 'Zacatecas',
        'detroit': 'Detroit',
        'tijuana': 'Tijuana',
        'midlothian': 'Midlothian'
    };

    // Buscar cada ciudad en la dirección
    for (const [cityLower, cityProper] of Object.entries(cities)) {
        if (addressLower.includes(cityLower)) {
            console.log('City found:', cityProper);
            console.log('=== End Debug ===\n');
            cityCache.set(addressLower, cityProper);
            return cityProper;
        }
    }
    
    console.log('No city found, returning default');
    console.log('=== End Debug ===\n');
    cityCache.set(addressLower, 'default');
    return 'default';
};

// Ejemplo de uso:
// const address = "Prol Av México 501, Boulevares, Guadalupe, 98612, Zacatecas"
// getCityFromAddress(address) // retorna 'Guadalupe' 

// Agregar después de las interfaces existentes
export type PlantImageMap = {
    'APTIV Planta Zacatecas': {
        thumbnail: string;
        full: string;
    };
    'HARMAN México': {
        thumbnail: string;
        full: string;
    };
    'Ford Hermosillo': {
        thumbnail: string;
        full: string;
    };
    'TOYOTA TMMGT': {
        thumbnail: string;
        full: string;
    };
    'SVAP VAN': {
        thumbnail: string;
        full: string;
    };
    'STAP Trucks': {
        thumbnail: string;
        full: string;
    };
    'TAP Toluca': {
        thumbnail: string;
        full: string;
    };
    'Patio Comodato Toluca': {
        thumbnail: string;
        full: string;
    };
    default: {
        thumbnail: string;
        full: string;
    };
};

export const plantImages: PlantImageMap = {
    'APTIV Planta Zacatecas': {
        thumbnail: '/images/plants/aptiv.png',
        full: '/images/plants/aptiv.png'
    },
    'HARMAN México': {
        thumbnail: '/images/plants/harmanqro.jpg',
        full: '/images/plants/harmanqro.jpg'
    },
    'Ford Hermosillo': {
        thumbnail: '/images/plants/fordhmo.jpg',
        full: '/images/plants/fordhmo.jpg'
    },
    'TOYOTA TMMGT': {
        thumbnail: '/images/plants/tmmgt.jpg',
        full: '/images/plants/tmmgt.jpg'
    },
    'SVAP VAN': {
        thumbnail: '/images/plants/svap.png',
        full: '/images/plants/svap.png'
    },
    'STAP Trucks': {
        thumbnail: '/images/plants/stap.jpg',
        full: '/images/plants/stap.jpg'
    },
    'TAP Toluca': {
        thumbnail: '/images/plants/tap.jpg',
        full: '/images/plants/tap.jpg'
    },
    'Patio Comodato Toluca': {
        thumbnail: '/images/plants/comodato.png',
        full: '/images/plants/comodato.png'
    },
    default: {
        thumbnail: '/images/plants/aptiv.png',
        full: '/images/plants/aptiv.png'
    }
}; 