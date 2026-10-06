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
