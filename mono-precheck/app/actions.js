"use server";

import { runPrecheck, searchCasOptions, searchChemicalByCas } from "../lib/precheck";

export async function searchChemicalAction(cas) {
  if (!cas?.trim()) return { error: "Enter a CAS number." };
  try { return await searchChemicalByCas(cas.trim()); }
  catch (error) { return { error: error instanceof Error ? error.message : "Chemical search failed." }; }
}

export async function casOptionsAction(term) {
  try { return { options: await searchCasOptions(term) }; }
  catch { return { options: [] }; }
}

export async function precheckAction(input) {
  try { return { result: await runPrecheck(input) }; }
  catch (error) { return { error: error instanceof Error ? error.message : "PIC precheck failed." }; }
}
