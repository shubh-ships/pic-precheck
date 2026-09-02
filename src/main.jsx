import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ChevronRight, Gauge, ShipWheel, FileText, Scale,
  BookOpen, Info, Search, ChevronDown, CheckCircle2,
  AlertTriangle, ExternalLink, Loader2
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

function App() {
  const [tab, setTab] = useState("export");
  const [cas, setCas] = useState("");
  const [country, setCountry] = useState(null);
  const [use, setUse] = useState(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [useOpen, setUseOpen] = useState(false);
  const [chemical, setChemical] = useState(null);
  const [searched, setSearched] = useState(false);
  const [precheck, setPrecheck] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [countries, setCountries] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/master/countries`).then(r => { if (!r.ok) throw new Error("Failed to load countries"); return r.json(); }),
      fetch(`${API_BASE}/master/pic-product-categories`).then(r => { if (!r.ok) throw new Error("Failed to load categories"); return r.json(); })
    ])
      .then(([countryData, categoryData]) => {
        setCountries(countryData.data || countryData.content || []);
        setCategories(categoryData.data || categoryData.content || []);
      })
      .catch(err => setError(err.message));
  }, []);

  const canValidate = Boolean(chemical?.chemicalId && country?.id && use?.id);

  async function searchChemical() {
    if (!cas.trim()) return;
    setSearchLoading(true);
    setError("");
    setPrecheck(null);
    setSearched(false);
    try {
      const response = await fetch(`${API_BASE}/chemicals/search?search=${encodeURIComponent(cas.trim())}&page=0&size=20`);
      if (!response.ok) throw new Error(`Chemical search failed (${response.status})`);
      const data = await response.json();
      const items = data.content || data.items || [];
      const exact = items.find(item => String(item.casNumber || "").trim() === cas.trim());
      const selected = exact || (items.length === 1 ? items[0] : null);
      if (!selected) {
        setChemical(null);
        setSearched(true);
        setError(items.length ? "Multiple chemicals found. Enter the exact CAS number." : "No chemical found for this CAS number.");
        return;
      }
      let annexIII = false;
      try {
        const annexResponse = await fetch(`${API_BASE}/chemicals/annex-status?chemicalId=${encodeURIComponent(selected.chemicalId)}`);
        if (annexResponse.ok) {
          const annexData = await annexResponse.json();
          annexIII = Boolean(annexData.annexIII);
        }
      } catch (_) {
        annexIII = false;
      }
      setChemical({ ...selected, annexIII });
      setCas(selected.casNumber || cas.trim());
      setSearched(true);
    } catch (err) {
      setChemical(null);
      setSearched(true);
      setError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }

  async function runPrecheck() {
    if (!canValidate) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        chemicalId: String(chemical.chemicalId),
        countryId: String(country.id),
        categoryId: String(use.id),
        isAnnex: "true"
      });
      const response = await fetch(`${API_BASE}/pic/precheck?${params.toString()}`);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `PIC precheck failed (${response.status})`);
      }
      setPrecheck(await response.json());
    } catch (err) {
      setPrecheck(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function selectCountry(value) {
    setCountry(value);
    setCountryOpen(false);
    setPrecheck(null);
  }

  function selectUse(value) {
    setUse(value);
    setUseOpen(false);
    setPrecheck(null);
  }

  const resultState = useMemo(() => {
    if (!precheck) return null;
    return precheck.explicitConsentRequired ? "consent" : "clear";
  }, [precheck]);

  return (
    <div className="app">
      <div className="convention-strip">
        <div>BRS CONVENTIONS</div><div>BASEL CONVENTION</div>
        <div className="selected">ROTTERDAM CONVENTION</div><div>STOCKHOLM CONVENTION</div>
      </div>

      <div className="platform-shell">


        <main className="content">
          <div className="title-row"><div><div className="eyebrow">NCEC • ROTTERDAM CONVENTION</div>
            <h2>Export / Import PIC Precheck</h2><p>Prior Informed Consent precheck for chemicals and pesticides in international trade</p></div></div>

          <div className="tabs-row">
            <div className="tabs">
              <button className={tab === "export" ? "tab active" : "tab"} onClick={() => setTab("export")}><ShipWheel size={19}/> Export Precheck</button>
              <button className={tab === "import" ? "tab active" : "tab"} onClick={() => setTab("import")}><ShipWheel size={19}/> Import Precheck</button>
            </div>
            <div className="quick-links">
              <button className="blue-btn">Import Response Lookup</button><button className="blue-btn">FRA Lookup</button>
              <button className="white-btn"><BookOpen size={16}/> Annex III Chemicals</button><button className="white-btn"><Info size={16}/> About PIC Procedure</button>
            </div>
          </div>

          <section className="card">
            <div className="card-heading"><div><h3>{tab === "export" ? "Export PIC Precheck" : "Import PIC Precheck"}</h3></div></div>
            <div className="divider"/>

            <div className="form-grid">
              <div className="field search-field"><label>Chemical lookup by CAS Number <Info size={14}/></label>
                <div className="search-wrap"><Search size={17}/><input value={cas} onChange={e => { setCas(e.target.value); setSearched(false); setChemical(null); setPrecheck(null); setError(""); }} placeholder="Search by CAS number" />
                  <button className="search-action" onClick={searchChemical} disabled={searchLoading}>{searchLoading ? <Loader2 size={16} className="spin"/> : "Search"}</button></div>
              </div>
              <ReadOnly label="CAS Number" value={chemical?.casNumber} placeholder="Auto-populated after search"/>
              <ReadOnly label="CAS Name" value={chemical?.scientificName} placeholder="Auto-populated after search"/>
              <ReadOnly label="IUPAC Name (English)" value={chemical?.scientificName} placeholder="Auto-populated after search"/>
              <ReadOnly label="Annex III Status" value={chemical ? (chemical.annexIII ? "Listed" : "Not Listed") : ""} placeholder="Shown after CAS search"/>
              <ReadOnly label="Listed Use Category" value={precheck?.useCategoryName} placeholder="Calculated after precheck"/>

              <div className="field"><label>Importing Country <em>*</em></label><Dropdown value={country?.name} placeholder="Select importing country" open={countryOpen} setOpen={setCountryOpen} options={countries} onSelect={selectCountry}/></div>
              <div className="field"><label>Intended Use Category <Info size={14}/></label><Dropdown value={use?.name} placeholder="Select intended use category" open={useOpen} setOpen={setUseOpen} options={categories} onSelect={selectUse}/></div>

              <ReadOnly label="Is Party to PIC?" value={precheck ? (precheck.isPartyToPic ? "Yes" : "No") : ""} placeholder="Calculated after selection"/>
              <ReadOnly label="Import Response Status" value={precheck?.importResponse?.decision} placeholder="Calculated after selection" info/>
              <ReadOnly label="Final Regulatory Action From Importing Country" value={precheck?.finalRegulatoryAction?.fraName} placeholder="Calculated after selection" info/>
              <ReadOnly label="Explicit Consent Required?" value={precheck ? (precheck.explicitConsentRequired ? "Yes" : "No") : ""} placeholder="Calculated after selection" info/>
            </div>

            {error && <div className="api-error"><AlertTriangle size={20}/><div><strong>Unable to complete request</strong><p>{error}</p></div></div>}

            {precheck ? (
              <div className={`validation ${resultState === "consent" ? "warning" : "success"}`}>
                <div className="validation-title">{resultState === "consent" ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}<strong>{resultState === "consent" ? "Explicit Consent Required" : "PIC Precheck Passed"}</strong>
</div>
                <div className="message">{resultState === "consent" ? "The selected chemical and importing country require explicit consent under the current PIC data and rules." : "No explicit consent requirement was returned for the selected combination."}</div>
                <div className="rules"><h4>Precheck result</h4><ul>
                  <li>Annex III: {precheck.annexIII ? "Listed" : "Not listed"}.</li>
                  <li>Category match: {precheck.categoryMatch ? "Yes" : "No"}.</li>
                  <li>Import response: {precheck.importResponse?.decision || "N/A"}.</li>
                  <li>Final Regulatory Action: {precheck.finalRegulatoryAction?.fraName || "N/A"}.</li>
                </ul></div>
              </div>
            ) : (
              <div className="empty-state"><div className="empty-icon"><Search size={22}/></div><div><strong>{canValidate ? "Ready for PIC Precheck" : "Start a PIC Precheck"}</strong>
                <p>{canValidate ? "All required inputs are selected. Run the PIC precheck to evaluate the applicable Rotterdam Convention requirements." : "Enter a CAS number, select the importing country and choose the intended use category. Results will appear here after the required inputs are provided."}</p>
                {canValidate && <button className="validate-btn" onClick={runPrecheck} disabled={loading}>{loading ? <><Loader2 size={16} className="spin"/> Running...</> : "Run PIC Precheck"}</button>}</div></div>
            )}
          </section>

          <section className="pitch-note"><div className="pitch-icon"><BookOpen size={20}/></div><div><strong>Rotterdam Convention PIC Precheck</strong>
            <p>This screen is designed as the NCEC platform's operational precheck layer, using the Rotterdam Convention concepts of Annex III chemicals, Import Responses and Final Regulatory Actions.</p></div>
            <a href="https://www.pic.int/" target="_blank" rel="noreferrer">pic.int <ExternalLink size={14}/></a></section>
        </main>
      </div>
    </div>
  );
}

function ReadOnly({label, value, placeholder, info}) { return <div className="field"><label>{label} {info && <Info size={14}/>}</label><div className="readonly">{value || <span className="placeholder">{placeholder}</span>}</div></div>; }

function Dropdown({value, placeholder, open, setOpen, options, onSelect}) {
  return <div className="dropdown"><button className="select" onClick={() => setOpen(!open)}><span className={value ? "" : "placeholder"}>{value || placeholder}</span><ChevronDown size={17}/></button>
    {open && <div className="dropdown-menu">{options.map(o => <button key={o.id} onClick={() => onSelect(o)}>{o.name}</button>)}</div>}</div>;
}

createRoot(document.getElementById("root")).render(<App/>);
