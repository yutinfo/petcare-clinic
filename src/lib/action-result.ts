import { BusinessError, ForbiddenError, UnauthenticatedError } from "@/modules/shared";

export function fail(err: unknown): { ok: false; message: string } {
  if (
    err instanceof BusinessError ||
    err instanceof ForbiddenError ||
    err instanceof UnauthenticatedError
  ) {
    return { ok: false, message: err.message };
  }
  console.error(err);
  return { ok: false, message: "ทำรายการไม่สำเร็จ" };
}

export function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}
