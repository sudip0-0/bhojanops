"use server";

import { AuthError } from "next-auth";
import { signIn, signOut, RateLimitedError } from "@/auth";

export async function login(_prev: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof RateLimitedError) {
      const seconds = Math.ceil(error.retryAfterMs / 1000);
      return `Too many failed attempts. Try again in ${seconds}s.`;
    }
    if (error instanceof AuthError) return "Invalid email or password.";
    throw error; // redirect throws are re-thrown
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
