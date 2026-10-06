# Cruce de geografía e inversión · Honda

Fuente: `HOnda segementaciones  (1).xlsx`, hojas `META_PERFORMANCE_DIA` y `META_SEGMENTACIONES`. Cruce por Ad Set ID; configuración geográfica leída de `Targeting completo JSON`.

## Qué fallaba

El importe de **$14.820.236** atribuido a «Nariño» era un reparto artificial de la inversión entre los nombres de ciudades del snapshot. Omitía departamentos, países y otras zonas del conjunto, y unía tres municipios homónimos. El Excel no contiene gasto entregado por ciudad, por lo que ese importe se retira sin sustituirlo por otra estimación.

Ejemplo: `ALCANCE_CIUDADES_CB100` gastó **$6.972.489** y configura Nariño, Antioquia, más **7 departamentos y 1 zona**. El método anterior cargaba todo ese gasto a Nariño por ser el único nombre en la columna Ciudades.

## Identidades separadas

| Ciudad y departamento | ID de Meta | Conjuntos | Gasto total de esos conjuntos* |
|---|---|---:|---:|
| Nariño · Antioquia | 474864 | 1 | $6.972.489 |
| Nariño · Nariño | 474867 | 4 | $12.561.013 |
| Nariño · Cundinamarca | 474871 | 7 | $64.177.369 |

**\* Es gasto compartido de los conjuntos en todas sus ubicaciones, no inversión entregada en esos municipios.** No se incorpora gasto de conjuntos nacionales/departamentales a una ciudad sin una mención explícita. La segmentación describe la configuración del archivo; no prueba cómo estaba configurado cada día histórico.

## Trazabilidad del importe anterior

| Conjunto | Nariño identificado | Gasto del conjunto | Atribución anterior (inválida) |
|---|---|---:|---:|
| ALCANCE_CIUDADES_CB100 | Nariño · Antioquia | $6.972.489 | $6.972.489 |
| CB125F_DLX_FANALCA | Nariño · Nariño | $2.799.994 | $2.799.994 |
| PEF_INTERESES_CIUDADES_CB100 | Nariño · Nariño | $4.882.392 | $542.488 |
| PEF_INTERESES_CIUDADES_XR150L-20 | Nariño · Nariño | $1.508.049 | $754.024 |
| CB190_PROGRESER_2 | Nariño · Cundinamarca | $3.499.907 | $29.660 |
| PEF_INTERESES_NAVI_JUNIO | Nariño · Cundinamarca | $9.861.382 | $57.002 |
| CB125F_FANALCA | Nariño · Nariño | $3.370.578 | $3.370.578 |
| PEF_INTERESES_CB100 | Nariño · Cundinamarca | $25.151.011 | $145.382 |
| PEF_INTERESES_XBLADE | Nariño · Cundinamarca | $7.909.585 | $45.986 |
| PEF_INTERESES_WAVE | Nariño · Cundinamarca | $8.488.727 | $49.068 |
| PEF_INTERESES_DIO-STD | Nariño · Cundinamarca | $4.905.514 | $28.356 |
| PEF_INTERESES_DIO-DLX | Nariño · Cundinamarca | $4.361.243 | $25.209 |

Los redondeos de cada fila pueden diferir del total redondeado. La atribución anterior suma exactamente 14820236.318173688 COP antes del redondeo.

## Control financiero

- 31.045 de 31.045 filas diarias coinciden individualmente en inversión y leads.
- Inversión total: **$961.236.261**. Leads: **150.030**. Periodo: **2025-10-01 a 2026-09-30**.
- 246 conjuntos con performance; 244 cruzan con segmentación. Los otros 2 suman $65 y quedan sin geografía asignada.
- No se detectaron duplicados en fecha + Ad Set ID. El archivo `data-packed.js` no se modifica.

| Configuración exclusiva de cada conjunto | Conjuntos | Gasto |
|---|---:|---:|
| Solo ciudades | 45 | $106.726.824 |
| Solo departamentos | 31 | $61.978.339 |
| Solo país | 126 | $573.487.383 |
| Geografía mixta | 42 | $219.043.650 |
| Sin segmentación | 2 | $65 |

Los cinco grupos son mutuamente excluyentes y suman el total del snapshot. En cambio, el listado por ciudad permite que un conjunto aparezca en varias filas; allí los presupuestos no se deben sumar.

## Cambios

- Geografía tipada con ID de Meta, departamento, radios y exclusiones.
- 303 ciudades distintas por ID; 259 coordenadas contrastadas por nombre y departamento.
- Mapa y ranking basados en número de conjuntos asociados, con inversión local marcada «Sin desglose».
- Detalle de conjuntos con su gasto total y todas las zonas configuradas.
- Reconciliación reproducible en `scripts/reconcile_geography.py` y pruebas en `tests/geography.test.cjs`.

SHA-256 del Excel: `d124e9031ffd30655c211e702e62d27fae110c9821ca03466bf72b2047d87357`.
