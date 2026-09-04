import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

/** Thrown when the account exists but the email has not been verified yet. */
export class UnverifiedEmailError extends CredentialsSignin {
  code = "unverified";
}

/** Thrown when an admin has suspended the account. */
export class SuspendedAccountError extends CredentialsSignin {
  code = "suspended";
}

// A constant-time-ish dummy hash so timing is similar whether or not the
// email exists (prevents trivial user enumeration via response time).
const DUMMY_HASH =
  "$2a$12$CwTycUXWue0Thq9StjUM0uJ8b0Z1L0wq7iQm7Q8u7KfN0f6yq5g5W";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            emailVerified: true,
            role: true,
            status: true,
            sessionVersion: true,
          },
        });

        const ok = await bcrypt.compare(
          password,
          user?.passwordHash ?? DUMMY_HASH,
        );
        if (!user || !ok) return null;

        if (!user.emailVerified) throw new UnverifiedEmailError();
        if (user.status === "SUSPENDED") throw new SuspendedAccountError();

        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
