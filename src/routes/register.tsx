import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { MailCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registerUser, loginUser } from "@/server/auth";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await registerUser({ data: { displayName, email, password } });
      if (result.needsEmailConfirmation) {
        setAwaitingConfirmation(true);
        return;
      }
      await loginUser({ data: { email, password } });
      await router.navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mendaftar.");
    } finally {
      setLoading(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <MailCheckIcon className="text-primary mb-2 size-10" />
            <CardTitle>Cek Email Anda</CardTitle>
            <CardDescription>
              Kami sudah mengirim tautan konfirmasi ke <strong>{email}</strong>. Silakan buka email tersebut dan
              klik tautannya untuk mengaktifkan akun sebelum masuk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" render={<Link to="/login" />}>
              Ke Halaman Masuk
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Daftar</CardTitle>
          <CardDescription>Buat akun untuk mulai membangun silsilah keluarga.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="displayName">Nama</FieldLabel>
                <Input
                  id="displayName"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Button type="submit" disabled={loading}>
                {loading ? "Memproses..." : "Daftar"}
              </Button>
              <p className="text-muted-foreground text-sm text-center">
                Sudah punya akun?{" "}
                <Link to="/login" className="text-primary underline underline-offset-4">
                  Masuk
                </Link>
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
