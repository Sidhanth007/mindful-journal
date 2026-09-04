import type { Metadata } from "next";
import { getPendingEmail } from "../actions";
import { VerifyEmailForm } from "./verify-email-form";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const params = await searchParams;
  const email = (await getPendingEmail()) ?? "";
  const unverified = params.reason === "unverified";

  return <VerifyEmailForm email={email} unverified={unverified} />;
}
