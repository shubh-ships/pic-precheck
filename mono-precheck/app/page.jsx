import { getMasterData } from "../lib/precheck";
import PrecheckForm from "./precheck-form";

export const dynamic = "force-dynamic";
// Azure SQL serverless can take longer than Vercel's default function timeout to
// resume from auto-pause; raise the cap so the pool's connection wait isn't cut short.
export const maxDuration = 60;

export default async function Page() {
  try {
    const { countries, categories } = await getMasterData();
    return <PrecheckForm countries={countries} categories={categories} />;
  } catch (error) {
    // Full detail (hostnames, driver errors, stack) goes to server logs only —
    // the page itself must never leak connection internals to visitors.
    console.error("PIC Precheck: failed to load master data", error);
    return (
      <main className="startup-error">
        <h1>PIC Precheck is temporarily unavailable</h1>
        <p>We couldn&apos;t reach the database right now. Please try again shortly.</p>
        <p>If this continues, contact the site administrator.</p>
      </main>
    );
  }
}
