import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Location {
    id: number;
    name: string;
    coordinates: [number, number];
    status: 'presente' | 'ausente' | 'en-ruta';
    city: string;
    checkInTime?: string;
    checkOutTime?: string;
    delayMinutes?: number;
    markerType?: 'check-in' | 'check-out';
    projectName?: string;
    photo?: string;
    photo_check_in?: string;
    photo_check_out?: string;
}

interface LocationContextType {
    locations: Location[];
    updateLocation: (location: Location) => void;
    removeLocation: (id: number) => void;
    clearLocations: () => void;
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

    const clearLocations = () => {
        setLocations([]);
    };

    useEffect(() => {
        const handleLocationUpdate = (event: CustomEvent<{
            id: number;
            name: string;
            coordinates: [number, number];
            status: string;
            city: string;
            checkInTime: string;
            checkOutTime?: string;
            delayMinutes?: number;
            markerType?: 'check-in' | 'check-out';
            projectName?: string;
            photo?: string;
            photo_check_in?: string;
            photo_check_out?: string;
        }>) => {
            console.log('Location update event received:', event.detail);
            console.log('Photo check-in:', event.detail.photo_check_in ? 'EXISTS' : 'NULL');
            console.log('Photo check-out:', event.detail.photo_check_out ? 'EXISTS' : 'NULL');
            
            const validStatuses = ['presente', 'ausente', 'en-ruta'] as const;
            const status = validStatuses.includes(event.detail.status as any)
                ? (event.detail.status as 'presente' | 'ausente' | 'en-ruta')
                : 'ausente';
            const location: Location = {
                id: event.detail.id,
                name: event.detail.name,
                coordinates: event.detail.coordinates,
                status: status,
                city: event.detail.city,
                checkInTime: event.detail.checkInTime,
                ...(event.detail.checkOutTime && { checkOutTime: event.detail.checkOutTime }),
                ...(event.detail.delayMinutes !== undefined && { delayMinutes: event.detail.delayMinutes }),
                ...(event.detail.markerType && { markerType: event.detail.markerType }),
                ...(event.detail.projectName && { projectName: event.detail.projectName }),
                ...(event.detail.photo && { photo: event.detail.photo }),
                ...(event.detail.photo_check_in && { photo_check_in: event.detail.photo_check_in }),
                ...(event.detail.photo_check_out && { photo_check_out: event.detail.photo_check_out })
            };
            console.log('Created location object:', {
                id: location.id,
                name: location.name,
                photo_check_in: location.photo_check_in ? 'EXISTS' : 'NULL',
                photo_check_out: location.photo_check_out ? 'EXISTS' : 'NULL'
            });
            updateLocation(location);
        };

        const handleClearLocations = () => {
            console.log('Clear locations event received');
            clearLocations();
        };

        window.addEventListener('locationUpdate', handleLocationUpdate as EventListener);
        window.addEventListener('clearLocations', handleClearLocations);
        
        return () => {
            window.removeEventListener('locationUpdate', handleLocationUpdate as EventListener);
            window.removeEventListener('clearLocations', handleClearLocations);
        };
    }, []);

    return (
        <LocationContext.Provider value={{ locations, updateLocation, removeLocation, clearLocations }}>
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