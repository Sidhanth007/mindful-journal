import type { Metadata } from "next";
import { getPendingEmail } from "../actions";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const email = (await getPendingEmail()) ?? "";
  return <ResetPasswordForm email={email} />;
}
