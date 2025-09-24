import { Text, Loader, Stack } from '@mantine/core';
import { WeatherData } from '../services/weather';

interface WeatherIndicatorProps {
    weatherData: WeatherData | null;
    loading?: boolean;
}

export function WeatherIndicator({ weatherData, loading = false }: WeatherIndicatorProps) {

    if (loading) {
        return (
            <Stack gap={2} align="center">
                <Loader size="lg" color="white" />
                <Text size="lg" c="white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                    Cargando clima...
                </Text>
            </Stack>
        );
    }

    if (!weatherData) {
        return (
            <Stack gap={2} align="center">
                <Text size="2xl" fw={700} c="white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>
                    --
                </Text>
                <Text size="lg" c="white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                    Clima no disponible
                </Text>
            </Stack>
        );
    }


    return (
        <Stack gap={2} align="center">
            <Text size="2xl" fw={700} c="white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>
                {weatherData.temperature}°C
            </Text>
            <Text size="lg" c="white" tt="capitalize" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                {weatherData.description}
            </Text>
        </Stack>
    );
}
