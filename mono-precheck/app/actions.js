"use server";

import { runPrecheck, searchChemical, searchChemicalOptions } from "../lib/precheck";

export async function searchChemicalAction(query) {
  if (!query?.trim()) return { error: "Enter a CAS number or chemical name." };
  try { return await searchChemical(query.trim()); }
  catch (error) { return { error: error instanceof Error ? error.message : "Chemical search failed." }; }
}

export async function casOptionsAction(term) {
  try { return { options: await searchChemicalOptions(term) }; }
  catch { return { options: [] }; }
}

export async function precheckAction(input) {
  try { return { result: await runPrecheck(input) }; }
  catch (error) { return { error: error instanceof Error ? error.message : "PIC precheck failed." }; }
}
