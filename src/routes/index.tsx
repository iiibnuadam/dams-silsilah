import { createFileRoute, Link } from "@tanstack/react-router";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { LineageMotif } from "@/components/marketing/LineageMotif";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <ModeToggle />
      </div>

      <div className="mx-auto grid min-h-screen max-w-5xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-0">
        <div>
          <span className="border-accent/40 bg-accent/10 text-accent-foreground/80 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide">
            Pendiri → Anak → Cucu → Cicit
          </span>
          <h1 className="font-display mt-5 text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl">
            Setiap keluarga punya catatan. Ini tempatnya.
          </h1>
          <p className="text-muted-foreground mt-4 max-w-md text-balance">
            Susun silsilah keluarga Anda dalam bagan yang hidup — satu individu bisa terhubung ke lebih dari satu
            silsilah, lengkap dengan riwayat perubahan dan tautan berbagi untuk sanak saudara.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" render={<Link to="/register" />}>
              Mulai Susun Silsilah
            </Button>
            <Button size="lg" variant="outline" render={<Link to="/login" />}>
              Masuk
            </Button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="bg-primary/10 absolute size-72 rounded-full blur-3xl" aria-hidden />
          <LineageMotif className="relative w-full max-w-sm" />
        </div>
      </div>
    </div>
  );
}
