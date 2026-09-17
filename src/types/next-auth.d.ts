import "next-auth";

declare module "next-auth" {
  interface User {
    kind?: "staff" | "owner";
  }

  interface Session {
    user: {
      id: string;
      kind: "staff" | "owner";
      displayName: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    kind?: "staff" | "owner";
  }
}
