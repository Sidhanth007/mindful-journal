import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  let notice: string | undefined;
  if (first(params.verified)) notice = "Email verified — you can log in now.";
  else if (first(params.reset)) notice = "Password updated — log in with your new password.";
  else if (first(params.reason) === "inactive") notice = "Your session ended or the account is inactive. Please log in again.";
  else if (first(params.reason) === "revoked") notice = "Your password was changed, so you've been logged out everywhere. Please log in again.";
  else if (first(params.deleted)) notice = "Your account and all its data have been deleted.";

  return <LoginForm notice={notice} next={first(params.next)} />;
}
