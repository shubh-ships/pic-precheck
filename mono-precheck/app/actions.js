"use server";

import { PrecheckValidationError, runPrecheck, searchChemical, searchChemicalOptions } from "../lib/precheck";

// DB/driver errors can contain hostnames, ports and other internals that must never
// reach the client; only our own validation errors are safe to show verbatim.
function safeErrorMessage(error, fallback) {
  if (error instanceof PrecheckValidationError) return error.message;
  console.error(fallback, error);
  return fallback;
}

export async function searchChemicalAction(query) {
  if (!query?.trim()) return { error: "Enter a CAS number or chemical name." };
  try { return await searchChemical(query.trim()); }
  catch (error) { return { error: safeErrorMessage(error, "Chemical search failed. Please try again.") }; }
}

export async function casOptionsAction(term) {
  try { return { options: await searchChemicalOptions(term) }; }
  catch (error) { console.error("Chemical options lookup failed.", error); return { options: [] }; }
}

export async function precheckAction(input) {
  try { return { result: await runPrecheck(input) }; }
  catch (error) { return { error: safeErrorMessage(error, "PIC precheck failed. Please try again.") }; }
}
