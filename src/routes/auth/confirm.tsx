import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmEmail } from "@/server/auth";

const searchSchema = z.object({
  token_hash: z.string().optional(),
  type: z.enum(["signup", "invite", "magiclink", "recovery", "email_change", "email"]).optional(),
});

export const Route = createFileRoute("/auth/confirm")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ tokenHash: search.token_hash, type: search.type }),
  loader: async ({ deps }) => {
    if (!deps.tokenHash || !deps.type) {
      return { ok: false as const, message: "Tautan konfirmasi tidak valid atau sudah kedaluwarsa." };
    }
    try {
      await confirmEmail({ data: { tokenHash: deps.tokenHash, type: deps.type } });
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, message: err instanceof Error ? err.message : "Gagal memverifikasi email." };
    }
  },
  component: ConfirmPage,
});

function ConfirmPage() {
  const result = Route.useLoaderData();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          {result.ok ? (
            <>
              <CheckCircle2Icon className="text-primary mb-2 size-10" />
              <CardTitle>Email Berhasil Diverifikasi</CardTitle>
              <CardDescription>Akun Anda sudah aktif. Silakan lanjutkan untuk masuk.</CardDescription>
            </>
          ) : (
            <>
              <XCircleIcon className="text-destructive mb-2 size-10" />
              <CardTitle>Verifikasi Gagal</CardTitle>
              <CardDescription>{result.message}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          <Button className="w-full" render={<Link to="/login" />}>
            Lanjutkan untuk Masuk
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
