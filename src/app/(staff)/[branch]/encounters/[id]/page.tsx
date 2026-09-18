import { notFound, redirect } from "next/navigation";
import { getEncounterWorkspace } from "@/modules/clinical";
import { BusinessError, UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";
import { EncounterWorkspace } from "./workspace";

export default async function EncounterPage({
  params,
}: {
  params: Promise<{ branch: string; id: string }>;
}) {
  const { branch, id } = await params;
  if (id.length < 20) notFound();
  try {
    const ctx = await getStaffContext(branch);
    const data = await getEncounterWorkspace(ctx, id);
    return <EncounterWorkspace branch={branch} data={data} />;
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    if (err instanceof BusinessError && err.message.includes("ไม่พบ")) notFound();
    throw err;
  }
}
