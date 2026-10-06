# Geographic and brand assets

- `honda.svg`: official Honda Colombia footer mark, downloaded unchanged from https://motocicletas.honda.com.co/images/svg/logo-footer.svg on 2026-10-06.
- `colombia.geo.json`: simplified continental boundary from https://github.com/johan/world.geo.json/blob/master/countries/COL.geo.json. Original longitude/latitude coordinates retained. It is not a department or coverage-radius map.
- `city-coordinates.json`: derived from the Colombia GeoNames country export https://download.geonames.org/export/dump/CO.zip, retrieved 2026-10-06. Attribution: GeoNames, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Fields retained: GeoNames ID, name, latitude, longitude and feature code.

Matching is case/accent insensitive against names and alternate names of PPLC/PPLA/PPLA2 populated administrative seats. A snapshot name is mapped only when the gazetteer yields exactly one candidate, on the continental map. There are 223 matches among the 287 configured location names. The other 64 are retained in the ranking/filter without guessing a location, including homonyms and regional names. Coordinates describe municipal seats, not users, radius targeting or actual ad delivery.

`geo-data.js` bundles the outline and matched coordinates locally. Both country outline and points use the same equirectangular projection (standard latitude 4°), a shared SVG viewBox, and the same zoom/pan transform. Clusters only group nearby markers visually; they do not change financial totals.

Investment values come from the existing snapshot. Each Ad Set's investment is split equally among its configured locations, then summed. This is a targeting estimate, not measured geographic delivery. Selecting a city filters all performance views to the Ad Sets that include it; their full performance differs from the geographic allocation.

## Excel reconciliation supersedes the initial city-name matching

`geo-targeting.js` is now the authoritative geography source. It uses Meta geographic IDs and departments from the uploaded Excel, preserving 303 city identities. GeoNames matching uses canonical department names, then primary city names (falling back to alternate names) within that department. 259 included cities have a unique coordinate match. This resolves the three distinct Nariño municipalities; it does not infer actual delivery. The old `city-coordinates.json` and `CITY_COORDINATES` constant are retained as historical unused inputs.

No equal-share allocation is used anymore. The UI shows Ad Set associations and preserves their full shared spend, explicitly non-additive across city rows. All location types are retained, including regions, countries, subcities, neighborhoods and places. See `docs/GEO_RECONCILIATION.md` for financial checks and source hash.

## Motorcycle reference photography · October 2026

`assets/motos/` contains 14 official Honda Colombia motorcycle reference photographs and the Honda Dream brand mark, downloaded unchanged from the product catalogue at https://motocicletas.honda.com.co/ . Individual URLs, retrieval dates and SHA-256 hashes are recorded in `assets/motos/sources.json`. `x-blade.png` is the original PNG served by Honda under a `.jpg` URL; only its filename extension was corrected.

Images are local assets (no remote hotlinks), preserve their original transparency and are displayed with `object-fit: contain`. Current catalogue photographs illustrate the model family; colors/equipment/model years may differ from the historical campaign. DIO and DIO DLX use different matching product photographs.

DREAM is displayed as a brand campaign grouping with the official Honda Dream mark. Its snapshot rows include Honda Dream branding, XADV and Sahara Ad Sets; a Dream Neo motorcycle photograph would not represent that grouping. Existing model classification and financial records are unchanged. The NT1100 photograph and Honda Dream mark were obtained from https://motocicletas.honda.com.co/motos-honda/aventura/NT-1100 .
