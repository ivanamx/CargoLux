import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Location {
    id: number;
    name: string;
    coordinates: [number, number];
    status: 'presente' | 'ausente' | 'en-ruta';
    city: string;
    checkInTime?: string;
    delayMinutes?: number;
}

interface LocationContextType {
    locations: Location[];
    updateLocation: (location: Location) => void;
    removeLocation: (id: number) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
    const [locations, setLocations] = useState<Location[]>([]);

    const updateLocation = (location: Location) => {
        setLocations(prev => {
            const exists = prev.find(loc => loc.id === location.id);
            if (exists) {
                return prev.map(loc => loc.id === location.id ? location : loc);
            }
            return [...prev, location];
        });
    };

    const removeLocation = (id: number) => {
        setLocations(prev => prev.filter(loc => loc.id !== id));
    };

    return (
        <LocationContext.Provider value={{ locations, updateLocation, removeLocation }}>
            {children}
        </LocationContext.Provider>
    );
}

export function useLocations() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocations must be used within a LocationProvider');
    }
    return context;
} 