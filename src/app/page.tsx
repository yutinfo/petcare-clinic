import { redirect } from "next/navigation";
import { auth } from "@/server/auth/config";

export default async function HomePage() {
  const session = await auth();
  if (session?.user.kind === "staff" && session.user.defaultBranchCode) {
    redirect(`/${session.user.defaultBranchCode}/reception`);
  }
  if (session?.user.kind === "owner") {
    redirect("/portal");
  }
  redirect("/login");
}
