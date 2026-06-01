import { resetPassword } from "./actions";
import { ResetPasswordForm } from "./form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <div className="rounded border bg-card p-6 text-sm text-muted-foreground shadow">
          Missing reset token. Open the link from your email.
        </div>
      </main>
    );
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <ResetPasswordForm token={token} action={resetPassword} />
    </main>
  );
}
