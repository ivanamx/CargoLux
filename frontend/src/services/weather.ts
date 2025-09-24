// Servicio para obtener datos del clima
export interface WeatherData {
    temperature: number;
    description: string;
    icon: string;
    weatherCode: string;
    windSpeed: number;
}

export class WeatherService {
    // Usando WeatherAPI que es más simple y confiable
    private static readonly API_KEY = '6ecad2a061004608b3b155258251809'; // API key de WeatherAPI (gratuita)
    private static readonly BASE_URL = 'https://api.weatherapi.com/v1/current.json';

    static async getWeatherByCity(cityName: string): Promise<WeatherData | null> {
        try {
            const url = `${this.BASE_URL}?key=${this.API_KEY}&q=${encodeURIComponent(cityName)}&aqi=no`;
            console.log('Weather API URL:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Weather API Error Response:', errorText);
                return null;
            }
            
            const data = await response.json();
            console.log('Weather API Success:', data);
            
            // Mapear la respuesta de WeatherAPI a nuestro formato
            const weatherCode = this.mapWeatherCode(data.current.condition.code, data.current.is_day);
            
            return {
                temperature: Math.round(data.current.temp_c),
                description: data.current.condition.text,
                icon: weatherCode,
                weatherCode: weatherCode,
                windSpeed: data.current.wind_kph
            };
        } catch (error) {
            console.error('Error fetching weather data:', error);
            return null;
        }
    }

    // Mapear códigos de WeatherAPI a códigos de OpenWeatherMap para compatibilidad
    private static mapWeatherCode(code: number, isDay: number): string {
        const dayNight = isDay ? 'd' : 'n';
        
        const codeMap: { [key: number]: string } = {
            1000: `01${dayNight}`, // Clear
            1003: `02${dayNight}`, // Partly cloudy
            1006: `04${dayNight}`, // Cloudy
            1009: `04${dayNight}`, // Overcast
            1030: `50${dayNight}`, // Mist
            1063: `09${dayNight}`, // Patchy rain possible
            1066: `13${dayNight}`, // Patchy snow possible
            1069: `13${dayNight}`, // Patchy sleet possible
            1072: `13${dayNight}`, // Patchy freezing drizzle possible
            1087: `11${dayNight}`, // Thundery outbreaks possible
            1114: `13${dayNight}`, // Blowing snow
            1117: `13${dayNight}`, // Blizzard
            1135: `50${dayNight}`, // Fog
            1147: `50${dayNight}`, // Freezing fog
            1150: `09${dayNight}`, // Patchy light drizzle
            1153: `09${dayNight}`, // Light drizzle
            1168: `09${dayNight}`, // Freezing drizzle
            1171: `09${dayNight}`, // Heavy freezing drizzle
            1180: `10${dayNight}`, // Patchy light rain
            1183: `10${dayNight}`, // Light rain
            1186: `10${dayNight}`, // Moderate rain at times
            1189: `10${dayNight}`, // Moderate rain
            1192: `10${dayNight}`, // Heavy rain at times
            1195: `10${dayNight}`, // Heavy rain
            1198: `10${dayNight}`, // Light freezing rain
            1201: `10${dayNight}`, // Moderate or heavy freezing rain
            1204: `13${dayNight}`, // Light sleet
            1207: `13${dayNight}`, // Moderate or heavy sleet
            1210: `13${dayNight}`, // Patchy light snow
            1213: `13${dayNight}`, // Light snow
            1216: `13${dayNight}`, // Patchy moderate snow
            1219: `13${dayNight}`, // Moderate snow
            1222: `13${dayNight}`, // Patchy heavy snow
            1225: `13${dayNight}`, // Heavy snow
            1237: `13${dayNight}`, // Ice pellets
            1240: `10${dayNight}`, // Light rain shower
            1243: `10${dayNight}`, // Moderate or heavy rain shower
            1246: `10${dayNight}`, // Torrential rain shower
            1249: `13${dayNight}`, // Light sleet showers
            1252: `13${dayNight}`, // Moderate or heavy sleet showers
            1255: `13${dayNight}`, // Light snow showers
            1258: `13${dayNight}`, // Moderate or heavy snow showers
            1261: `13${dayNight}`, // Light showers of ice pellets
            1264: `13${dayNight}`, // Moderate or heavy showers of ice pellets
            1273: `11${dayNight}`, // Patchy light rain with thunder
            1276: `11${dayNight}`, // Moderate or heavy rain with thunder
            1279: `11${dayNight}`, // Patchy light snow with thunder
            1282: `11${dayNight}`, // Moderate or heavy snow with thunder
        };
        
        return codeMap[code] || `01${dayNight}`;
    }

    static async getWeatherByCoordinates(lat: number, lon: number): Promise<WeatherData | null> {
        try {
            const url = `${this.BASE_URL}?key=${this.API_KEY}&q=${lat},${lon}&aqi=no`;
            console.log('Weather API URL (coordinates):', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Weather API Error Response:', errorText);
                return null;
            }
            
            const data = await response.json();
            console.log('Weather API Success (coordinates):', data);
            
            // Mapear la respuesta de WeatherAPI a nuestro formato
            const weatherCode = this.mapWeatherCode(data.current.condition.code, data.current.is_day);
            
            return {
                temperature: Math.round(data.current.temp_c),
                description: data.current.condition.text,
                icon: weatherCode,
                weatherCode: weatherCode,
                windSpeed: data.current.wind_kph
            };
        } catch (error) {
            console.error('Error fetching weather data:', error);
            return null;
        }
    }
}
