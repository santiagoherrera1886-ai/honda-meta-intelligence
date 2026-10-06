# Honda Meta Intelligence

Dashboard web para analizar performance, segmentaciones y creatividades de Meta Ads de Honda Motos Colombia.

## Estado actual

La data ya está integrada dentro del proyecto como snapshot optimizado, por lo que el usuario final **no necesita cargar un Excel** para usar el dashboard.

## Incluye

- Filtro por modelo de moto.
- Selector visual de 15 modelos con imágenes oficiales disponibles y una ficha identificada cuando falta la imagen.
- Navegación lateral y móvil sincronizada, enlaces directos y botones Atrás/Adelante del navegador.
- Filtro por ciudad configurada en el targeting del Ad Set.
- Filtro por campaña, tipo de audiencia, tipo de entrega y fechas.
- RMK, LKL, BBDD, Intereses y Broad.
- Inversión, leads, CPL, impresiones, alcance diario, frecuencia proxy, clicks, CTR, CPC, CPM, CVR y LPV Rate.
- Explorador de segmentaciones.
- Intereses, behaviors, edad, género y ciudades.
- Ranking de campañas.
- Galería creativa con thumbnail y preview de Meta cuando está disponible.
- Data Health.

## Data incluida

Snapshot actual del archivo de Meta:
- Periodo: octubre 2025 a septiembre 2026.
- Performance diario integrado.
- Segmentaciones de los Ad Sets con performance.
- Creativos priorizados por inversión.

## Nota sobre ciudad

El filtro de ciudad representa la **ciudad configurada en el targeting del Ad Set**. No debe interpretarse como un breakdown de entrega real por ciudad.

El mapa interactivo utiliza un único sistema de coordenadas para el contorno y los puntos. Permite acercar, alejar, arrastrar, restablecer y seleccionar una ubicación desde el mapa o el ranking. Los grupos de puntos se abren con clic. Las ubicaciones se pueden buscar por nombre y los filtros se pueden limpiar.

Se identificaron coordenadas inequívocas para 223 de los 287 nombres configurados. Los 64 restantes permanecen disponibles en filtros y ranking, sin inventar una posición. Procedencia y reglas: [assets/SOURCES.md](assets/SOURCES.md).

La inversión geográfica es un reparto uniforme del gasto entre ubicaciones del Ad Set, no inversión entregada y medida por ciudad. Las métricas de los anuncios son agregadas del snapshot completo: no hay desglose diario por anuncio.

## Desarrollo y publicación

Aplicación estática sin compilación. Para servirla localmente: `python -m http.server 8000` desde esta carpeta. La rama `main` despliega mediante la integración existente de Vercel. Dirección principal: https://honda-meta-intelligence.vercel.app/ . Los enlaces de despliegues individuales corresponden a versiones fijas.

`app-nav.js` centraliza la navegación y solo renderiza la sección visible. `app-map.js` contiene la interacción geográfica; `geo-data.js` incluye los recursos geográficos locales. `workspace.css` define el sistema de espacios y las adaptaciones de escritorio/móvil sobre los estilos existentes.

## Nota sobre alcance

El alcance diario no es aditivo entre fechas. Una misma persona puede aparecer en más de un día, por lo que el acumulado se presenta como **Alcance diario*** y la frecuencia agregada como proxy.
