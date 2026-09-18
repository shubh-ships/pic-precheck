"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { casOptionsAction, precheckAction, searchChemicalAction } from "./actions";

const ReadOnly = ({ label, value, placeholder }) => <div className="field"><label>{label}</label><div className="readonly">{value || <span className="placeholder">{placeholder}</span>}</div></div>;

export default function PrecheckForm({ countries, categories }) {
  const [cas, setCas] = useState("");
  const [casOptions, setCasOptions] = useState([]);
  const [showCasOptions, setShowCasOptions] = useState(false);
  const [chemical, setChemical] = useState(null);
  const [countryId, setCountryId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const canValidate = chemical && countryId && categoryId;
  const status = useMemo(() => result?.explicitConsentRequired ? "consent" : "clear", [result]);

  useEffect(() => {
    const term = cas.trim();
    if (term.length < 2) { setCasOptions([]); return; }
    const timeout = setTimeout(async () => {
      const response = await casOptionsAction(term);
      setCasOptions(response.options ?? []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [cas]);

  function resetAfterInput() { setChemical(null); setResult(null); setError(""); }
  function search(casNumber = cas) {
    startTransition(async () => {
      const response = await searchChemicalAction(casNumber);
      setResult(null); setError(response.error ?? ""); setChemical(response.chemical ?? null);
      if (response.chemical?.casNumber) setCas(response.chemical.casNumber);
    });
  }
  function selectCas(casNumber) { setCas(casNumber); setShowCasOptions(false); resetAfterInput(); search(casNumber); }
  function validate() {
    startTransition(async () => {
      const response = await precheckAction({ chemicalId: chemical.chemicalId, countryId, categoryId });
      setError(response.error ?? ""); setResult(response.result ?? null);
    });
  }

  return <div className="app">
    <main className="content">
      <div className="eyebrow">ROTTERDAM CONVENTION</div><h1>Export PIC Precheck</h1><p className="subtitle">Prior Informed Consent precheck for chemicals and pesticides in international trade</p>
      <section className="card"><div className="divider" />
        <div className="form-grid">
          <div className="field">
            <label>Chemical lookup by CAS Number</label>
            <div className="combobox">
              <div className="search-wrap">
                <input value={cas} onChange={(event) => { setCas(event.target.value); setShowCasOptions(true); resetAfterInput(); }} onFocus={() => setShowCasOptions(true)} onBlur={() => setTimeout(() => setShowCasOptions(false), 150)} onKeyDown={(event) => event.key === "Enter" && search()} placeholder="Type to search CAS numbers" autoComplete="off" />
                <button onClick={() => search()} disabled={isPending}>{isPending ? "Working…" : "Search"}</button>
              </div>
              {showCasOptions && casOptions.length > 0 && <ul className="combobox-options">
                {casOptions.map((option) => <li key={option.casNumber} onMouseDown={() => selectCas(option.casNumber)}><span className="cas-code">{option.casNumber}</span><span className="cas-name">{option.scientificName}</span></li>)}
              </ul>}
            </div>
          </div>
          <ReadOnly label="CAS Number" value={chemical?.casNumber} placeholder="Auto-populated after search" /><ReadOnly label="CAS Name" value={chemical?.scientificName} placeholder="Auto-populated after search" />
          <ReadOnly label="IUPAC Name (English)" value={chemical?.scientificName} placeholder="Auto-populated after search" /><ReadOnly label="Annex III Status" value={chemical ? chemical.annexIII ? "Listed" : "Not Listed" : ""} placeholder="Shown after CAS search" /><ReadOnly label="Listed Use Category" value={result?.useCategoryName} placeholder="Calculated after precheck" />
          <div className="field"><label>Importing Country <em>*</em></label><select value={countryId} onChange={(event) => { setCountryId(event.target.value); setResult(null); }}><option value="">Select importing country</option>{countries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div className="field"><label>Intended Use Category <em>*</em></label><select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setResult(null); }}><option value="">Select intended use category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <ReadOnly label="Is Party to PIC?" value={result ? result.isPartyToPic ? "Yes" : "No" : ""} placeholder="Calculated after selection" /><ReadOnly label="Import Response Status" value={result?.importResponse?.decision} placeholder="Calculated after selection" /><ReadOnly label="Final Regulatory Action" value={result?.finalRegulatoryAction?.fraName} placeholder="Calculated after selection" /><ReadOnly label="Explicit Consent Required?" value={result ? result.explicitConsentRequired ? "Yes" : "No" : ""} placeholder="Calculated after selection" />
        </div>
        {error && <div className="api-error"><strong>Unable to complete request.</strong> {error}</div>}
        {result ? <div className={`validation ${status}`}><h3>{status === "consent" ? "Explicit Consent Required" : "PIC Precheck Passed"}</h3><p>{status === "consent" ? "The selected chemical and importing country require explicit consent under the current PIC data and rules." : "No explicit consent requirement was returned for the selected combination."}</p><ul><li>Annex III: {result.annexIII ? "Listed" : "Not listed"}</li><li>Category match: {result.categoryMatch ? "Yes" : "No"}</li><li>Import response: {result.importResponse.decision}</li><li>Final Regulatory Action: {result.finalRegulatoryAction.fraName}</li></ul></div> : <div className="empty-state"><strong>{canValidate ? "Ready for PIC Precheck" : "Start a PIC Precheck"}</strong><p>{canValidate ? "All required inputs are selected." : "Enter a CAS number, select the importing country and choose the intended use category."}</p>{canValidate && <button className="validate-btn" onClick={validate} disabled={isPending}>{isPending ? "Running…" : "Run PIC Precheck"}</button>}</div>}
      </section>
      <section className="pitch-note"><strong>Rotterdam Convention PIC Precheck</strong><p>This operational precheck uses Annex III chemicals, Import Responses and Final Regulatory Actions.</p></section>
    </main>
  </div>;
}
