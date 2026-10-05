# Honda Meta Intelligence

Dashboard web interactivo para analizar performance, segmentaciones y creatividades de Meta Ads para Honda Motos Colombia.

## Qué analiza

- Performance por modelo de moto, campaña y conjunto de anuncios.
- Día, mes y periodo personalizado.
- Inversión, leads, CPL, alcance, impresiones, frecuencia, clicks, CTR, CPC, CPM, LPV, CVR y LPV Rate.
- Audiencias: RMK, LKL, BBDD, intereses, Broad y Advantage.
- Intereses, behaviors, cargos, edad, género y geografía configurada.
- Galería de anuncios con thumbnail, métricas, preview de Meta e Instagram cuando existe.
- Data Health para revisar cobertura de segmentaciones, creativos y cruces por ID.

## Cómo usar

1. Abre el dashboard.
2. Pulsa **Cargar Excel**.
3. Selecciona el archivo generado por el extractor de Meta.
4. El dashboard espera estas hojas cuando estén disponibles:
   - META_PERFORMANCE_DIA
   - META_SEGMENTACIONES
   - META_ANUNCIOS
   - META_ADS_PERFORMANCE
5. Usa los filtros de modelo, campaña, audiencia, entrega, fecha e intereses.

## Privacidad

El Excel se procesa localmente en el navegador. Este dashboard estático no sube el archivo a un servidor.

## Nota de métricas

El alcance diario no es aditivo entre fechas: una misma persona puede aparecer en varios días. Por eso los acumulados se muestran como **Alcance diario*** y la frecuencia agregada como un proxy.

Los previews dependen de las URLs devueltas por Meta; algunos enlaces pueden expirar o requerir sesión iniciada en Meta.
