# Mono PIC Precheck

This is the small-project replacement for the separate Vite frontend and Express backend. It uses Next.js App Router: the screen is a server component, interactive lookup/precheck operations are Server Actions, and Azure SQL / SQL Server is accessed only from server-only modules.

## Run

1. Copy `.env.example` to `.env.local` and enter the Azure SQL credentials.
2. Install dependencies with `npm install`.
3. Run `npm run dev`.

## Database layout

The existing prototype uses SQL Server. Keep its layout on your Azure SQL logical server:

- `chemical_db.mas.chemicals`
- `chemical_db.mas.common_masters`
- `pic.mas.annexiiicategory`
- `pic.mas.finalregulatoryaction`
- `pic.mas.finalregulatoryactioncategory`
- `pic.mas.importresponse`

The `mas` schema must be migrated along with the tables. `pic` and `chemical_db` are separate databases, configured with `PIC_DB` and `CHEMICAL_DB`.

## Extracted rules

- Annex III applies when an active, non-deleted category record exists.
- Explicit consent is required for a matching Annex III category, or a Final Regulatory Action of `Banned` (505) / `Severely Restricted` (506).
- A PIC party is a country represented in either import responses or final regulatory actions—the behavior copied from the current backend.
