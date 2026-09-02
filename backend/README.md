# Rotterdam Convention PIC Precheck - Node.js Backend

This backend provides the APIs needed by the new PIC Precheck UI.

## Important category rule
The Intended Use Category dropdown returns ONLY the four active `PIC_PRODUCT_CATEGORY` records from `chemical_db.mas.common_masters`:

1. Pesticides (17 / PES)
2. Severly Hazardous Pesticide Formulation (SHPF) (18 / SHPF)
3. Pesticide Formulation (19 / PESF)
4. Industrial (20 / IND)

Inactive categories such as Explosives, Pre-cursors, Industrial Chemical and Pesticide/Industrial are not returned.

## APIs

### Health
GET `/health`

### Category dropdown
GET `/api/master/pic-product-categories`

### Country dropdown
GET `/api/master/countries`
Optional: `/api/master/countries?search=india`

### Chemical search
GET `/api/chemicals/search?search=chl&page=0&size=20`

Other supported filters: `casNumber`, `scientificName`.

### PIC Precheck
GET `/api/pic/precheck?chemicalId=11011&countryId=172&categoryId=17&isAnnex=true`

The precheck reads:
- `chemical_db.mas.chemicals`
- `pic.mas.annexiiicategory`
- `chemical_db.mas.common_masters`
- `pic.mas.finalregulatoryaction`
- `pic.mas.finalregulatoryactioncategory`
- `pic.mas.importresponse`

## FRA note
The supplied new DB has no `PIC_FRA_CATEGORY` master rows for FRA IDs 505 and 506. The existing Java logic refers to the names `Banned` and `Severely Restricted`. Therefore this backend keeps the mapping in `src/utils/fraRules.js` so it is easy to replace when the official master is available.

## Party-to-PIC note
The Java method calls `existsInEither(countryId)`, but that method/source was not part of the supplied exports. Therefore the API returns `isPartyToPic: null` instead of inventing a source.

## VS Code setup

1. Extract this ZIP.
2. Open the extracted folder in VS Code.
3. Open Terminal -> New Terminal.
4. Run `npm install`.
5. Copy `.env.example` to `.env`.
6. Open `.env` and set your SQL Server credentials.
7. Run `npm run dev`.
8. Open `http://localhost:5000/health`.
9. Test category API: `http://localhost:5000/api/master/pic-product-categories`.
10. Test chemical API: `http://localhost:5000/api/chemicals/search?search=chl`.
11. Test precheck with real IDs from your DB.

## SQL Server / Docker
If SQL Server is exposed from Docker on port 1433, keep `DB_SERVER=localhost` and `DB_PORT=1433`. If your SQL Server uses another host/port, change those values in `.env`.

## Frontend
The frontend should call the backend base URL, for example:
`http://localhost:5000`

For the category dropdown, do NOT hardcode the options in React. Call `/api/master/pic-product-categories`; the DB's active records will control the four options.
