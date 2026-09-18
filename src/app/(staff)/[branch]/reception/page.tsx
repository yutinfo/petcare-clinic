import { redirect } from "next/navigation";
import { listWaitingEncounters } from "@/modules/clinical";
import { listSpecies } from "@/modules/crm";
import { UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { ReceptionDesk } from "./reception-desk";

export default async function ReceptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ branch: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { branch } = await params;
  const { q } = await searchParams;
  try {
    const ctx = await getStaffContext(branch);
    const [species, waiting] = await Promise.all([listSpecies(ctx), listWaitingEncounters(ctx)]);
    return (
      <ReceptionDesk
        branch={branch}
        species={species}
        initialWaiting={waiting}
        initialQuery={q ?? ""}
      />
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    throw err;
  }
}
