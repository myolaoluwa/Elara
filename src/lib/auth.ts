import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceForUser } from "@/lib/workspace-bootstrap";

export const auth = betterAuth({
  appName: "Elara",
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureWorkspaceForUser(user.id, user.name);
        },
      },
    },
  },
  plugins: [nextCookies()],
});
