import "next-auth";

export type SessionBranch = {
  id: string;
  code: string;
  name: string;
};

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
      tenantId?: string;
      tenantSlug?: string;
      tenantName?: string;
      membershipId?: string | null;
      ownerId?: string;
      defaultBranchCode?: string;
      permissions: string[];
      branches: SessionBranch[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    kind?: "staff" | "owner";
    tenantId?: string;
    tenantSlug?: string;
    tenantName?: string;
    membershipId?: string;
    ownerId?: string;
    defaultBranchCode?: string;
    permissions?: string[];
    branches?: SessionBranch[];
  }
}
