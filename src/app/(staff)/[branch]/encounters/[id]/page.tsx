import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatThaiDateTime, UnauthenticatedError } from "@/modules/shared";
import { getStaffContext } from "@/server/staff-context";

export default async function EncounterPage({
  params,
}: {
  params: Promise<{ branch: string; id: string }>;
}) {
  const { branch, id } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const encounter = await ctx.tx((tx) =>
      tx.encounter.findFirst({
        where: { id },
        include: {
          pet: { include: { species: true, alerts: true, weights: { orderBy: { measuredAt: "desc" }, take: 1 } } },
          owner: { include: { phones: true } },
        },
      }),
    );
    if (!encounter) notFound();

    const weight = encounter.pet.weights[0]?.weightKg?.toString();
    const phone = encounter.owner.phones.find((p) => p.isPrimary)?.digits;

    return (
      <article className="mx-auto max-w-xl space-y-4">
        <p className="text-sm text-teal-800">เปิดเคสแล้ว</p>
        <h1 className="text-3xl font-semibold">{encounter.number}</h1>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3">
          <p className="text-xl font-medium">
            {encounter.pet.name}{" "}
            <span className="text-base font-normal text-stone-500">{encounter.pet.species.nameTh}</span>
          </p>
          <p className="text-stone-600">
            เจ้าของ {encounter.owner.firstName}
            {phone ? ` · ${phone}` : ""}
          </p>
          <p className="text-stone-600">มาถึง {formatThaiDateTime(encounter.arrivedAt)}</p>
          {weight ? <p className="text-stone-600">น้ำหนัก {weight} กก.</p> : null}
          {encounter.chiefComplaint ? (
            <p className="text-stone-600">อาการ: {encounter.chiefComplaint}</p>
          ) : null}
          {encounter.pet.alerts.length > 0 ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              ⚠ {encounter.pet.alerts.map((a) => a.label).join(" · ")}
            </p>
          ) : null}
        </div>
        <Link href={`/${branch}/reception`} className="inline-flex h-12 items-center text-teal-800 underline">
          กลับไปเคาน์เตอร์
        </Link>
      </article>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    throw err;
  }
}
