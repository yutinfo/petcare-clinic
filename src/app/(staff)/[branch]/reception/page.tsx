import { redirect } from "next/navigation";
import { listWaitingEncounters } from "@/modules/clinical";
import { listSpecies } from "@/modules/crm";
import { UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { ReceptionDesk } from "./reception-desk";

export default async function ReceptionPage({
  params,
}: {
  params: Promise<{ branch: string }>;
}) {
  const { branch } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const [species, waiting] = await Promise.all([
      listSpecies(ctx),
      listWaitingEncounters(ctx),
    ]);
    return <ReceptionDesk branch={branch} species={species} initialWaiting={waiting} />;
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    throw err;
  }
}
