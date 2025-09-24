import React from 'react';
import { Helmet } from 'react-helmet-async';

interface LandingPageSEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    canonicalUrl?: string;
    ogImage?: string;
}

const LandingPageSEO: React.FC<LandingPageSEOProps> = ({
    title = "CargoLux - Plataforma de Control de Asistencia Inteligente | Gestión de Equipos y Escaneo QR",
    description = "La plataforma más avanzada para control de asistencia con escaneo QR, geolocalización, gestión de equipos y proyectos. Optimiza tu empresa con tecnología de vanguardia. ¡Prueba gratis!",
    keywords = "control asistencia, escaneo QR, geolocalización, gestión equipos, control proyectos, software empresarial, tecnología, optimización procesos, dashboard tiempo real, reportes automáticos",
    canonicalUrl = "https://apizhe.lat",
    ogImage = "https://apizhe.lat/og-image.jpg"
}) => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "ControlAsist",
        "description": description,
        "url": canonicalUrl,
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, iOS, Android",
        "offers": {
            "@type": "Offer",
            "price": "0.50",
            "priceCurrency": "USD",
            "description": "Precio por escaneo con descuentos por volumen"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "500",
            "bestRating": "5",
            "worstRating": "1"
        },
        "author": {
            "@type": "Organization",
            "name": "ControlAsist",
            "url": canonicalUrl
        },
        "featureList": [
            "Escaneo QR con geolocalización",
            "Gestión de equipos y empleados",
            "Dashboard en tiempo real",
            "Reportes automáticos",
            "Control de proyectos",
            "API completa",
            "Seguridad empresarial",
            "Escalabilidad cloud"
        ]
    };

    const organizationData = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "ControlAsist",
        "url": canonicalUrl,
        "logo": "https://apizhe.lat/logo.png",
        "description": description,
        "foundingDate": "2024",
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+52-55-1234-5678",
            "contactType": "customer service",
            "availableLanguage": ["Spanish", "English"]
        },
        "sameAs": [
            "https://linkedin.com/company/controlasist",
            "https://twitter.com/controlasist",
            "https://facebook.com/controlasist"
        ]
    };

    const faqData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "¿Cómo funciona el sistema de escaneo?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Nuestra tecnología QR permite escanear códigos únicos con geolocalización precisa. Cada escaneo se registra automáticamente con timestamp, ubicación y validación en tiempo real."
                }
            },
            {
                "@type": "Question",
                "name": "¿Es seguro para datos empresariales?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Absolutamente. Utilizamos encriptación AES-256, cumplimos con normativas de protección de datos y ofrecemos auditorías de seguridad regulares."
                }
            },
            {
                "@type": "Question",
                "name": "¿Puedo personalizar los reportes?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí, ofrecemos reportes completamente personalizables, dashboards en tiempo real y exportación en múltiples formatos (PDF, Excel, CSV)."
                }
            },
            {
                "@type": "Question",
                "name": "¿Qué incluye el soporte técnico?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Soporte 24/7, documentación completa, capacitación del equipo y actualizaciones regulares de la plataforma."
                }
            },
            {
                "@type": "Question",
                "name": "¿Hay límite de usuarios?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No hay límite de usuarios. Nuestra arquitectura cloud escala automáticamente según las necesidades de tu empresa."
                }
            }
        ]
    };

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />
            <link rel="canonical" href={canonicalUrl} />
            
            {/* Language and Locale */}
            <meta httpEquiv="content-language" content="es-MX" />
            <meta name="language" content="Spanish" />
            <meta name="geo.region" content="MX" />
            <meta name="geo.country" content="Mexico" />
            
            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:site_name" content="ControlAsist" />
            <meta property="og:locale" content="es_MX" />
            
            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={canonicalUrl} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />
            <meta name="twitter:site" content="@controlasist" />
            <meta name="twitter:creator" content="@controlasist" />
            
            {/* Mobile Optimization */}
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <meta name="apple-mobile-web-app-title" content="ControlAsist" />
            
            {/* Performance and Caching */}
            <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
            <meta name="format-detection" content="telephone=no" />
            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            <meta name="googlebot" content="index, follow" />
            <meta name="bingbot" content="index, follow" />
            
            {/* Security */}
            <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
            <meta httpEquiv="X-Frame-Options" content="DENY" />
            <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
            <meta name="referrer" content="strict-origin-when-cross-origin" />
            
            {/* Theme and Icons */}
            <meta name="theme-color" content="#667eea" />
            <meta name="msapplication-TileColor" content="#667eea" />
            <meta name="msapplication-config" content="/browserconfig.xml" />
            <link rel="icon" type="image/x-icon" href="/favicon.ico" />
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
            <link rel="manifest" href="/site.webmanifest" />
            
            {/* Preconnect for Performance */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="preconnect" href="https://api.apizhe.lat" />
            <link rel="dns-prefetch" href="https://images.unsplash.com" />
            
            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(structuredData)}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(organizationData)}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(faqData)}
            </script>
            
            {/* Additional SEO Meta Tags */}
            <meta name="author" content="ControlAsist Team" />
            <meta name="copyright" content="ControlAsist 2025" />
            <meta name="revisit-after" content="7 days" />
            <meta name="distribution" content="global" />
            <meta name="rating" content="general" />
            
            {/* Business Information */}
            <meta name="business:contact_data:street_address" content="Ciudad de México, México" />
            <meta name="business:contact_data:locality" content="Ciudad de México" />
            <meta name="business:contact_data:region" content="CDMX" />
            <meta name="business:contact_data:postal_code" content="01000" />
            <meta name="business:contact_data:country_name" content="México" />
            
            {/* App Store Links */}
            <meta name="apple-itunes-app" content="app-id=123456789" />
            <meta name="google-play-app" content="app-id=com.controlasist.app" />
            
            {/* Additional Performance Hints */}
            <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
            <link rel="preload" href="/images/hero-bg.jpg" as="image" />
            
            {/* Critical CSS Inline */}
            <style>
                {`
                    /* Critical above-the-fold styles */
                    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
                    .hero-section { min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .loading { opacity: 0; transition: opacity 0.3s ease; }
                    .loaded { opacity: 1; }
                `}
            </style>
        </Helmet>
    );
};

export default LandingPageSEO;
