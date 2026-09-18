import { getMasterData } from "../lib/precheck";
import PrecheckForm from "./precheck-form";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const { countries, categories } = await getMasterData();
    return <PrecheckForm countries={countries} categories={categories} />;
  } catch (error) {
    return <main className="startup-error"><h1>PIC Precheck is not connected</h1><p>{error.message}</p><p>Add the MySQL settings from <code>.env.example</code> to <code>.env.local</code>, then restart the app.</p></main>;
  }
}
