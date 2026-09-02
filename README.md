# Rotterdam PIC Precheck UI

Frontend for the PIC Export/Import Precheck. It connects to the Node backend at `http://localhost:5001/api` by default.

Current UI behavior:
- Export/Import Precheck tabs without the KSA prefix.
- Import Response Lookup, FRA Lookup, Annex III Chemicals and About PIC Procedure on the same row.
- No Arabic labels or Arabic chemical fields.
- No workflow button.
- No left-side menu icons.
- CAS search checks the Annex III mapping from `pic.mas.annexiiicategory` through the backend `/api/chemicals/annex-status` endpoint and displays Listed/Not Listed immediately after CAS search.
