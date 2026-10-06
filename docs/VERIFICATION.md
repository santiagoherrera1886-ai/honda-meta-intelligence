# Honda workspace verification · 2026-10-06

Historical UI checks before the Excel reconciliation. Geographic allocation rules and counts below have been superseded by `GEO_RECONCILIATION.md`.

## Interaction checks

A jsdom harness loaded the real 31,045-row snapshot and all application scripts. Chart.js was stubbed for DOM interaction checks; real charts were then checked in the deployed browser.

- Seven sidebar sections each select exactly one visible view and synchronize mobile navigation state.
- Invalid hash routes return to Overview instead of leaving a blank page.
- Model selection filters the data and updates the hero; resetting restores the complete portfolio. NAVI keeps its own identity instead of borrowing the CB 300F label/image.
- Map zoom/reset changes and restores the shared SVG viewBox. Maximum zoom exposes individual city markers.
- A marker activated with Enter applies the matching city filter; clearing restores the original rows.
- Ranking selection and accent-insensitive search work, including Santiago de Cali. The expanded list retains all 287 names.
- Ambiguous Nariño remains filterable and explains why it has no map marker.
- Segment filters, empty date ranges, invalid date order, and resetting filters were checked across all sections without render exceptions.
- Snapshot file unchanged: 31,045 performance rows; 15 classified model choices; total spend COP 961,236,261. Geographic allocation totals COP 325,770,474 before filtering. 223 of 287 location names have a unique geographic match.

## Deployed browser checks

On https://honda-meta-intelligence.vercel.app/ at a 1,363-pixel viewport:

- All seven navigation buttons open their corresponding content, without a render-error message or horizontal document overflow.
- Visible Chart.js canvases have nonzero width and height in Overview, Models, Audiences and Campaigns.
- Santa Marta marker selection reduces the snapshot to 3,913 matching rows and one geographic allocation.
- Ranking search and selection of Santiago de Cali reduces the snapshot to 2,022 rows and one identified map point.
- PCX160 card selection shows PCX 160 ABS in the hero and 5,751 matching rows.
- Map dragging changes the SVG viewBox; reset returns to the original extent.
- Browser Back and Forward restore Overview and Cities, respectively.
- The hero image loads; all 15 model choices are available.

Responsive rules were reviewed and the mobile navigation state was exercised in the DOM harness. A physical mobile device was not used for this verification.

## Repeatable manual check

1. Open the main URL, visit each menu item, then use Back and Forward.
2. Select a motorcycle, inspect the model and filter summary, then reset.
3. Open Cities. Select a marker, clear the city, zoom a cluster, drag, and reset the map.
4. Search Cali in the ranking, select it, then clear all filters.
5. Set a date range without data and verify the empty states; reset afterwards.
6. Inspect the methodology explanation before comparing geographic estimates with full Ad Set performance.
