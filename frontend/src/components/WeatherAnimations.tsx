import { Box } from '@mantine/core';
import { keyframes } from '@emotion/react';

// Animaciones CSS para diferentes tipos de clima - OPTIMIZADAS
const rainAnimation = keyframes`
  0% { 
    transform: translateY(-120px) rotate(15deg); 
    opacity: 1; 
  }
  100% { 
    transform: translateY(120px) rotate(15deg); 
    opacity: 0; 
  }
`;

const snowAnimation = keyframes`
  0% { 
    transform: translateY(-120px) rotate(0deg); 
    opacity: 1; 
  }
  100% { 
    transform: translateY(120px) rotate(360deg); 
    opacity: 0; 
  }
`;

const sunshineAnimation = keyframes`
  0%, 100% { 
    opacity: 0.6; 
    transform: scale(1) rotate(0deg); 
  }
  50% { 
    opacity: 1; 
    transform: scale(1.15) rotate(180deg); 
  }
`;

const cloudAnimation = keyframes`
  0% { 
    transform: translateX(-80px) scale(0.8); 
    opacity: 0.3; 
  }
  50% { 
    transform: translateX(0px) scale(1); 
    opacity: 0.8; 
  }
  100% { 
    transform: translateX(80px) scale(0.8); 
    opacity: 0.3; 
  }
`;

const lightningAnimation = keyframes`
  0%, 85%, 100% { 
    opacity: 0; 
    transform: scale(1); 
  }
  5%, 10% { 
    opacity: 0.9; 
    transform: scale(1.05); 
  }
  12%, 15% { 
    opacity: 0.3; 
    transform: scale(0.95); 
  }
`;

// Animaciones de fondo - MEJORADAS
const sunnyGradientAnimation = keyframes`
  0% { 
    background-position: 0% 50%; 
    filter: hue-rotate(0deg); 
  }
  50% { 
    background-position: 100% 50%; 
    filter: hue-rotate(10deg); 
  }
  100% { 
    background-position: 0% 50%; 
    filter: hue-rotate(0deg); 
  }
`;

const rainGradientAnimation = keyframes`
  0% { 
    background-position: 0% 0%; 
    filter: brightness(1); 
  }
  50% { 
    background-position: 100% 100%; 
    filter: brightness(1.1); 
  }
  100% { 
    background-position: 0% 0%; 
    filter: brightness(1); 
  }
`;

const snowGradientAnimation = keyframes`
  0% { 
    background-position: 0% 0%; 
    filter: brightness(1.2); 
  }
  50% { 
    background-position: 100% 100%; 
    filter: brightness(1.4); 
  }
  100% { 
    background-position: 0% 0%; 
    filter: brightness(1.2); 
  }
`;

const stormGradientAnimation = keyframes`
  0% { 
    background-position: 0% 0%; 
    filter: brightness(0.8) contrast(1.2); 
  }
  25% { 
    background-position: 100% 0%; 
    filter: brightness(0.9) contrast(1.1); 
  }
  50% { 
    background-position: 100% 100%; 
    filter: brightness(0.7) contrast(1.3); 
  }
  75% { 
    background-position: 0% 100%; 
    filter: brightness(0.9) contrast(1.1); 
  }
  100% { 
    background-position: 0% 0%; 
    filter: brightness(0.8) contrast(1.2); 
  }
`;

const fogGradientAnimation = keyframes`
  0% { 
    background-position: 0% 50%; 
    filter: blur(0px) brightness(1); 
  }
  50% { 
    background-position: 100% 50%; 
    filter: blur(1px) brightness(1.1); 
  }
  100% { 
    background-position: 0% 50%; 
    filter: blur(0px) brightness(1); 
  }
`;

// Efectos adicionales - OPTIMIZADOS
const windAnimation = keyframes`
  0% { 
    transform: translateX(-120px) rotate(0deg); 
    opacity: 0; 
  }
  15% { 
    opacity: 0.8; 
  }
  85% { 
    opacity: 0.8; 
  }
  100% { 
    transform: translateX(120px) rotate(360deg); 
    opacity: 0; 
  }
`;

const cloudPassingAnimation = keyframes`
  0% { 
    transform: translateX(-150px) scale(0.5); 
    opacity: 0; 
  }
  20% { 
    opacity: 0.8; 
    transform: translateX(-75px) scale(0.8); 
  }
  80% { 
    opacity: 0.8; 
    transform: translateX(75px) scale(0.8); 
  }
  100% { 
    transform: translateX(150px) scale(0.5); 
    opacity: 0; 
  }
`;

const sunRaysAnimation = keyframes`
  0% { 
    transform: rotate(0deg) scale(1); 
    opacity: 0.5; 
  }
  25% { 
    transform: rotate(90deg) scale(1.1); 
    opacity: 0.8; 
  }
  50% { 
    transform: rotate(180deg) scale(1.2); 
    opacity: 1; 
  }
  75% { 
    transform: rotate(270deg) scale(1.1); 
    opacity: 0.8; 
  }
  100% { 
    transform: rotate(360deg) scale(1); 
    opacity: 0.5; 
  }
`;

const sparkleAnimation = keyframes`
  0%, 100% { 
    opacity: 0; 
    transform: scale(0) translateY(0px) rotate(0deg); 
  }
  20% { 
    opacity: 0.6; 
    transform: scale(0.6) translateY(-3px) rotate(72deg); 
  }
  40% { 
    opacity: 1; 
    transform: scale(1.1) translateY(-8px) rotate(144deg); 
  }
  60% { 
    opacity: 0.8; 
    transform: scale(0.9) translateY(-5px) rotate(216deg); 
  }
  80% { 
    opacity: 0.4; 
    transform: scale(0.7) translateY(-2px) rotate(288deg); 
  }
`;

const fogMovementAnimation = keyframes`
  0% { 
    transform: translateX(-80px) translateY(0px) scale(0.8); 
    opacity: 0.2; 
  }
  25% { 
    transform: translateX(-20px) translateY(-8px) scale(1); 
    opacity: 0.5; 
  }
  50% { 
    transform: translateX(20px) translateY(-12px) scale(1.1); 
    opacity: 0.7; 
  }
  75% { 
    transform: translateX(60px) translateY(-8px) scale(1); 
    opacity: 0.4; 
  }
  100% { 
    transform: translateX(100px) translateY(0px) scale(0.8); 
    opacity: 0.2; 
  }
`;

// Animación de movimiento horizontal para efectos
const horizontalMoveAnimation = keyframes`
  0% { 
    transform: translateX(-30px) scale(0.8); 
    opacity: 0; 
  }
  20% { 
    opacity: 0.8; 
    transform: translateX(-15px) scale(1); 
  }
  80% { 
    opacity: 0.8; 
    transform: translateX(15px) scale(1); 
  }
  100% { 
    transform: translateX(30px) scale(0.8); 
    opacity: 0; 
  }
`;

// Animación de flotación mejorada
const floatAnimation = keyframes`
  0%, 100% { 
    transform: translateY(0px) rotate(0deg) scale(1); 
  }
  25% { 
    transform: translateY(-8px) rotate(2deg) scale(1.05); 
  }
  50% { 
    transform: translateY(-12px) rotate(0deg) scale(1.1); 
  }
  75% { 
    transform: translateY(-8px) rotate(-2deg) scale(1.05); 
  }
`;

// Nueva animación de pulsación
const pulseAnimation = keyframes`
  0%, 100% { 
    transform: scale(1); 
    opacity: 0.7; 
  }
  50% { 
    transform: scale(1.1); 
    opacity: 1; 
  }
`;

// Animación de rotación continua
const rotateAnimation = keyframes`
  0% { 
    transform: rotate(0deg); 
  }
  100% { 
    transform: rotate(360deg); 
  }
`;

interface WeatherAnimationsProps {
    weatherCode: string;
}

export function WeatherAnimations({ weatherCode }: WeatherAnimationsProps) {
    console.log('WeatherAnimations rendering with weatherCode:', weatherCode);
    
    // Determinar el tipo de clima basado en el código
    const getWeatherType = (code: string) => {
        if (code.includes('09') || code.includes('10')) return 'rain';
        if (code.includes('11')) return 'storm';
        if (code.includes('13')) return 'snow';
        if (code.includes('01')) return 'sunny';
        if (code.includes('02') || code.includes('03') || code.includes('04')) return 'cloudy';
        if (code.includes('50')) return 'fog';
        return 'sunny';
    };

    const weatherType = getWeatherType(weatherCode);

    // Obtener el fondo animado según el clima - MEJORADO
    const getAnimatedBackground = (type: string) => {
        switch (type) {
            case 'sunny':
                return {
                    background: 'linear-gradient(45deg, #FFD700, #FFE55C, #FFA500, #FFD700, #FFE55C, #FFA500)',
                    backgroundSize: '600% 600%',
                    animation: `${sunnyGradientAnimation} 12s ease-in-out infinite`,
                    willChange: 'background-position, filter'
                };
            case 'rain':
                return {
                    background: 'linear-gradient(135deg, #4A90E2, #357ABD, #2E5B8A, #4A90E2, #5BA0F2)',
                    backgroundSize: '500% 500%',
                    animation: `${rainGradientAnimation} 4s ease-in-out infinite`,
                    willChange: 'background-position, filter'
                };
            case 'snow':
                return {
                    background: 'linear-gradient(135deg, #E6F3FF, #B3D9FF, #80BFFF, #E6F3FF, #F0F8FF)',
                    backgroundSize: '500% 500%',
                    animation: `${snowGradientAnimation} 7s ease-in-out infinite`,
                    willChange: 'background-position, filter'
                };
            case 'storm':
                return {
                    background: 'linear-gradient(45deg, #2C3E50, #34495E, #1A252F, #2C3E50, #1B2631)',
                    backgroundSize: '500% 500%',
                    animation: `${stormGradientAnimation} 3s ease-in-out infinite`,
                    willChange: 'background-position, filter'
                };
            case 'cloudy':
                return {
                    background: 'linear-gradient(135deg, #95A5A6, #7F8C8D, #5D6D7E, #95A5A6, #A8B2B3)',
                    backgroundSize: '500% 500%',
                    animation: `${cloudAnimation} 10s ease-in-out infinite`,
                    willChange: 'background-position, filter'
                };
            case 'fog':
                return {
                    background: 'linear-gradient(135deg, #BDC3C7, #A6ACAF, #8E9295, #BDC3C7, #D5DBDB)',
                    backgroundSize: '500% 500%',
                    animation: `${fogGradientAnimation} 8s ease-in-out infinite`,
                    willChange: 'background-position, filter'
                };
            default:
                return {
                    background: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)',
                    backgroundSize: '300% 300%',
                    animation: `${sunnyGradientAnimation} 8s ease-in-out infinite`,
                    willChange: 'background-position'
                };
        }
    };

    // Efectos específicos para cada clima - OPTIMIZADOS
    const WeatherEffects = () => {
        switch (weatherType) {
            case 'sunny':
                return (
                    <>
                        {/* Rayos de sol giratorios mejorados */}
                        <Box
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                width: '80px',
                                height: '80px',
                                background: 'radial-gradient(circle, transparent 20%, rgba(255, 255, 0, 0.4) 30%, transparent 60%)',
                                animation: 'sunRays 5s linear infinite',
                                pointerEvents: 'none',
                                willChange: 'transform, opacity'
                            }}
                        />
                        {/* Partículas brillantes optimizadas */}
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Box
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: '4px',
                                    height: '4px',
                                    background: 'radial-gradient(circle, rgba(255, 255, 255, 1), rgba(255, 255, 0, 0.6))',
                                    borderRadius: '50%',
                                    left: `${15 + (i * 15)}%`,
                                    top: `${20 + (i * 12)}%`,
                                    animation: `sparkle 3s ease-in-out infinite, float 4s ease-in-out infinite`,
                                    animationDelay: `${i * 0.4}s`,
                                    pointerEvents: 'none',
                                    willChange: 'transform, opacity'
                                }}
                            />
                        ))}
                        {/* Efecto de calor */}
                        <Box
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: '100px',
                                height: '100px',
                                background: 'radial-gradient(circle, transparent 40%, rgba(255, 165, 0, 0.1) 60%, transparent 80%)',
                                transform: 'translate(-50%, -50%)',
                                animation: 'pulse 4s ease-in-out infinite',
                                pointerEvents: 'none',
                                willChange: 'transform, opacity'
                            }}
                        />
                        {/* Nubes suaves de fondo para clima soleado */}
                        {Array.from({ length: 2 }).map((_, i) => (
                            <Box
                                key={`sunny-cloud-${i}`}
                                style={{
                                    position: 'absolute',
                                    width: '60px',
                                    height: '25px',
                                    background: `
                                        radial-gradient(ellipse 40px 15px at 15px 10px, rgba(255, 255, 255, 0.15), transparent 70%),
                                        radial-gradient(ellipse 25px 12px at 35px 12px, rgba(255, 255, 255, 0.12), transparent 70%),
                                        radial-gradient(ellipse 20px 10px at 45px 10px, rgba(255, 255, 255, 0.1), transparent 70%)
                                    `,
                                    borderRadius: '30px 15px 20px 10px',
                                    top: `${30 + i * 40}%`,
                                    left: `${20 + i * 30}%`,
                                    animation: 'cloudPassing 20s linear infinite, float 10s ease-in-out infinite',
                                    animationDelay: `${i * 5}s`,
                                    pointerEvents: 'none',
                                    willChange: 'transform, opacity',
                                    filter: 'blur(0.3px)'
                                }}
                            />
                        ))}
                    </>
                );
            
            case 'rain':
                return (
                    <>
                        {/* Gotas de lluvia optimizadas */}
                        {Array.from({ length: 12 }).map((_, i) => (
                            <Box
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: '2px',
                                    height: '25px',
                                    background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.3))',
                                    left: `${8 + (i * 7)}%`,
                                    animation: 'rainDrop 1.2s linear infinite',
                                    animationDelay: `${i * 0.15}s`,
                                    pointerEvents: 'none',
                                    willChange: 'transform, opacity'
                                }}
                            />
                        ))}
                        {/* Efecto de viento mejorado */}
                        {Array.from({ length: 2 }).map((_, i) => (
                            <Box
                                key={`wind-${i}`}
                                style={{
                                    position: 'absolute',
                                    width: '40px',
                                    height: '3px',
                                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                                    top: `${25 + i * 40}%`,
                                    animation: 'windEffect 4s linear infinite',
                                    animationDelay: `${i * 0.8}s`,
                                    pointerEvents: 'none',
                                    willChange: 'transform, opacity'
                                }}
                            />
                        ))}
                        {/* Ondas de lluvia */}
                        <Box
                            style={{
                                position: 'absolute',
                                bottom: '0',
                                left: '0',
                                right: '0',
                                height: '20px',
                                background: 'linear-gradient(to top, rgba(255, 255, 255, 0.1), transparent)',
                                animation: 'pulse 2s ease-in-out infinite',
                                pointerEvents: 'none',
                                willChange: 'opacity'
                            }}
                        />
                    </>
                );
            
            case 'snow':
                return (
                    <>
                        {/* Copos de nieve optimizados */}
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Box
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: '6px',
                                    height: '6px',
                                    background: 'radial-gradient(circle, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0.6))',
                                    borderRadius: '50%',
                                    left: `${5 + (i * 12)}%`,
                                    animation: 'snowFlake 5s linear infinite, float 3s ease-in-out infinite',
                                    animationDelay: `${i * 0.3}s`,
                                    pointerEvents: 'none',
                                    willChange: 'transform, opacity'
                                }}
                            />
                        ))}
                        {/* Efecto de viento con nieve */}
                        <Box
                            style={{
                                position: 'absolute',
                                top: '20%',
                                left: '0',
                                right: '0',
                                height: '2px',
                                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                                animation: 'windEffect 6s ease-in-out infinite',
                                pointerEvents: 'none',
                                willChange: 'transform, opacity'
                            }}
                        />
                    </>
                );
            
            case 'storm':
                return (
                    <>
                        {/* Lluvia intensa optimizada */}
                        {Array.from({ length: 15 }).map((_, i) => (
                            <Box
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: '3px',
                                    height: '30px',
                                    background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.4))',
                                    left: `${3 + (i * 6)}%`,
                                    animation: 'rainDrop 0.8s linear infinite',
                                    animationDelay: `${i * 0.1}s`,
                                    pointerEvents: 'none',
                                    willChange: 'transform, opacity'
                                }}
                            />
                        ))}
                        {/* Rayos mejorados */}
                        <Box
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                                animation: 'lightning 4s infinite',
                                pointerEvents: 'none',
                                willChange: 'opacity, transform'
                            }}
                        />
                        {/* Efecto de viento intenso */}
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Box
                                key={`storm-wind-${i}`}
                                style={{
                                    position: 'absolute',
                                    width: '50px',
                                    height: '4px',
                                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
                                    top: `${15 + i * 25}%`,
                                    animation: 'windEffect 2s linear infinite',
                                    animationDelay: `${i * 0.3}s`,
                                    pointerEvents: 'none',
                                    willChange: 'transform, opacity'
                                }}
                            />
                        ))}
                    </>
                );
            
            case 'cloudy':
                return (
                    <>
                        {/* Nubes realistas pasando */}
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Box
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: '80px',
                                    height: '40px',
                                    background: `
                                        radial-gradient(ellipse 60px 25px at 20px 15px, rgba(255, 255, 255, 0.6), transparent 70%),
                                        radial-gradient(ellipse 45px 20px at 40px 20px, rgba(255, 255, 255, 0.5), transparent 70%),
                                        radial-gradient(ellipse 35px 18px at 60px 18px, rgba(255, 255, 255, 0.4), transparent 70%),
                                        radial-gradient(ellipse 25px 15px at 15px 25px, rgba(255, 255, 255, 0.3), transparent 70%),
                                        radial-gradient(ellipse 30px 12px at 50px 25px, rgba(255, 255, 255, 0.35), transparent 70%)
                                    `,
                                    borderRadius: '40px 20px 30px 25px',
                                    top: `${15 + i * 25}%`,
                                    animation: 'cloudPassing 15s linear infinite, float 8s ease-in-out infinite',
                                    animationDelay: `${i * 2.5}s`,
                                    pointerEvents: 'none',
                                    willChange: 'transform, opacity',
                                    filter: 'blur(0.5px)'
                                }}
                            />
                        ))}
                        {/* Efecto de sombra de nubes */}
                        <Box
                            style={{
                                position: 'absolute',
                                top: '30%',
                                left: '0',
                                right: '0',
                                height: '40px',
                                background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.1), transparent)',
                                animation: 'pulse 8s ease-in-out infinite',
                                pointerEvents: 'none',
                                willChange: 'opacity'
                            }}
                        />
                    </>
                );
            
            case 'fog':
                return (
                    <>
                        {/* Niebla realista moviéndose */}
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Box
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: '100px',
                                    height: '50px',
                                    background: `
                                        radial-gradient(ellipse 70px 30px at 25px 20px, rgba(255, 255, 255, 0.25), transparent 60%),
                                        radial-gradient(ellipse 50px 25px at 60px 25px, rgba(255, 255, 255, 0.2), transparent 60%),
                                        radial-gradient(ellipse 40px 20px at 80px 20px, rgba(255, 255, 255, 0.15), transparent 60%),
                                        radial-gradient(ellipse 30px 15px at 15px 35px, rgba(255, 255, 255, 0.18), transparent 60%),
                                        radial-gradient(ellipse 35px 18px at 45px 35px, rgba(255, 255, 255, 0.12), transparent 60%)
                                    `,
                                    borderRadius: '50px 30px 40px 20px',
                                    top: `${10 + i * 20}%`,
                                    animation: 'fogMovement 10s linear infinite, float 6s ease-in-out infinite',
                                    animationDelay: `${i * 1.5}s`,
                                    pointerEvents: 'none',
                                    willChange: 'transform, opacity',
                                    filter: 'blur(1px)'
                                }}
                            />
                        ))}
                        {/* Efecto de niebla general */}
                        <Box
                            style={{
                                position: 'absolute',
                                top: '0',
                                left: '0',
                                right: '0',
                                bottom: '0',
                                background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                                animation: 'pulse 6s ease-in-out infinite',
                                pointerEvents: 'none',
                                willChange: 'opacity'
                            }}
                        />
                    </>
                );
            
            default:
                return null;
        }
    };

    const animatedBackground = getAnimatedBackground(weatherType);
    
    // Crear estilos CSS dinámicos para asegurar que las animaciones funcionen
    const dynamicStyles = `
        @keyframes sunnyGradient {
            0% { background-position: 0% 50%; filter: hue-rotate(0deg) brightness(1); }
            25% { background-position: 25% 50%; filter: hue-rotate(2deg) brightness(1.05); }
            50% { background-position: 50% 50%; filter: hue-rotate(4deg) brightness(1.1); }
            75% { background-position: 75% 50%; filter: hue-rotate(2deg) brightness(1.05); }
            100% { background-position: 100% 50%; filter: hue-rotate(0deg) brightness(1); }
        }
        @keyframes rainGradient {
            0% { background-position: 0% 0%; filter: brightness(1); }
            50% { background-position: 100% 100%; filter: brightness(1.1); }
            100% { background-position: 0% 0%; filter: brightness(1); }
        }
        @keyframes snowGradient {
            0% { background-position: 0% 0%; filter: brightness(1.2); }
            50% { background-position: 100% 100%; filter: brightness(1.4); }
            100% { background-position: 0% 0%; filter: brightness(1.2); }
        }
        @keyframes stormGradient {
            0% { background-position: 0% 0%; filter: brightness(0.8) contrast(1.2); }
            25% { background-position: 100% 0%; filter: brightness(0.9) contrast(1.1); }
            50% { background-position: 100% 100%; filter: brightness(0.7) contrast(1.3); }
            75% { background-position: 0% 100%; filter: brightness(0.9) contrast(1.1); }
            100% { background-position: 0% 0%; filter: brightness(0.8) contrast(1.2); }
        }
        @keyframes cloudGradient {
            0% { background-position: 0% 50%; filter: brightness(1); }
            50% { background-position: 100% 50%; filter: brightness(1.1); }
            100% { background-position: 0% 50%; filter: brightness(1); }
        }
        @keyframes fogGradient {
            0% { background-position: 0% 50%; filter: blur(0px) brightness(1); }
            50% { background-position: 100% 50%; filter: blur(1px) brightness(1.1); }
            100% { background-position: 0% 50%; filter: blur(0px) brightness(1); }
        }
        
        /* Animaciones para efectos visuales */
        @keyframes rainDrop {
            0% { transform: translateY(-120px) rotate(15deg); opacity: 1; }
            100% { transform: translateY(120px) rotate(15deg); opacity: 0; }
        }
        @keyframes snowFlake {
            0% { transform: translateY(-120px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
        }
        @keyframes sunRays {
            0% { transform: rotate(0deg) scale(1); opacity: 0.5; }
            25% { transform: rotate(90deg) scale(1.1); opacity: 0.8; }
            50% { transform: rotate(180deg) scale(1.2); opacity: 1; }
            75% { transform: rotate(270deg) scale(1.1); opacity: 0.8; }
            100% { transform: rotate(360deg) scale(1); opacity: 0.5; }
        }
        @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0) translateY(0px) rotate(0deg); }
            20% { opacity: 0.6; transform: scale(0.6) translateY(-3px) rotate(72deg); }
            40% { opacity: 1; transform: scale(1.1) translateY(-8px) rotate(144deg); }
            60% { opacity: 0.8; transform: scale(0.9) translateY(-5px) rotate(216deg); }
            80% { opacity: 0.4; transform: scale(0.7) translateY(-2px) rotate(288deg); }
        }
        @keyframes cloudPassing {
            0% { transform: translateX(-150px) scale(0.5); opacity: 0; }
            20% { opacity: 0.8; transform: translateX(-75px) scale(0.8); }
            80% { opacity: 0.8; transform: translateX(75px) scale(0.8); }
            100% { transform: translateX(150px) scale(0.5); opacity: 0; }
        }
        @keyframes fogMovement {
            0% { transform: translateX(-80px) translateY(0px) scale(0.8); opacity: 0.2; }
            25% { transform: translateX(-20px) translateY(-8px) scale(1); opacity: 0.5; }
            50% { transform: translateX(20px) translateY(-12px) scale(1.1); opacity: 0.7; }
            75% { transform: translateX(60px) translateY(-8px) scale(1); opacity: 0.4; }
            100% { transform: translateX(100px) translateY(0px) scale(0.8); opacity: 0.2; }
        }
        @keyframes windEffect {
            0% { transform: translateX(-120px) rotate(0deg); opacity: 0; }
            15% { opacity: 0.8; }
            85% { opacity: 0.8; }
            100% { transform: translateX(120px) rotate(360deg); opacity: 0; }
        }
        @keyframes lightning {
            0%, 85%, 100% { opacity: 0; transform: scale(1); }
            5%, 10% { opacity: 0.9; transform: scale(1.05); }
            12%, 15% { opacity: 0.3; transform: scale(0.95); }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
            25% { transform: translateY(-8px) rotate(2deg) scale(1.05); }
            50% { transform: translateY(-12px) rotate(0deg) scale(1.1); }
            75% { transform: translateY(-8px) rotate(-2deg) scale(1.05); }
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.1); opacity: 1; }
        }
        
        .weather-animation-container {
            animation: ${weatherType === 'sunny' ? 'sunnyGradient' : 
                       weatherType === 'rain' ? 'rainGradient' :
                       weatherType === 'snow' ? 'snowGradient' :
                       weatherType === 'storm' ? 'stormGradient' :
                       weatherType === 'cloudy' ? 'cloudGradient' :
                       weatherType === 'fog' ? 'fogGradient' : 'sunnyGradient'} 
                       ${weatherType === 'sunny' ? '12s' : 
                        weatherType === 'rain' ? '4s' :
                        weatherType === 'snow' ? '7s' :
                        weatherType === 'storm' ? '3s' :
                        weatherType === 'cloudy' ? '10s' :
                        weatherType === 'fog' ? '8s' : '12s'} ease-in-out infinite;
        }
    `;
    
    return (
        <>
            <style>{dynamicStyles}</style>
            <Box
                className="weather-animation-container"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    overflow: 'hidden',
                    transition: 'all 0.5s ease-in-out',
                    ...animatedBackground
                }}
            >
                <WeatherEffects />
            </Box>
        </>
    );
}
