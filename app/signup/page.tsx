import type { Metadata } from "next";
import { SignUpForm } from "./_components/sign-up-form";

export const metadata: Metadata = {
  title: "Daftar",
  description: "Buat akun Zyvo gratis dan mulai membuat CV profesional.",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return <SignUpForm />;
}
