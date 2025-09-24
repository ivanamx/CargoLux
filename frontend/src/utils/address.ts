export function getCityFromAddress(address: string): string {
    // Simple implementation - you might want to enhance this based on your needs
    const cities = ['Saltillo', 'Monterrey'];
    for (const city of cities) {
        if (address.includes(city)) {
            return city;
        }
    }
    return 'default';
} 