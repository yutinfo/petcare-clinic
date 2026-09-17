import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { isStaffAppPath, tenantSlugFromHost } from "@/server/tenancy";

export async function middleware(req: NextRequest) {
  const slug = tenantSlugFromHost(req.headers.get("host"));
  const requestHeaders = new Headers(req.headers);
  if (slug) requestHeaders.set("x-tenant-slug", slug);

  const path = req.nextUrl.pathname;
  if (!isStaffAppPath(path)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token || token.kind !== "staff") {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("from", path);
    return NextResponse.redirect(login);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
