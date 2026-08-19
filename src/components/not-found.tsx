import { Link } from "@tanstack/react-router";
import { NetworkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="bg-accent/10 text-accent flex size-16 items-center justify-center rounded-2xl">
        <NetworkIcon className="size-8" />
      </div>
      <p className="text-muted-foreground text-sm font-semibold tracking-widest uppercase">Error 404</p>
      <h1 className="font-display text-3xl font-medium sm:text-4xl">Cabang ini tidak ditemukan</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Halaman yang Anda cari mungkin sudah dipindahkan, dihapus, atau tautannya keliru.
      </p>
      <div className="mt-2 flex gap-3">
        <Button render={<Link to="/dashboard">Ke Dashboard</Link>} />
        <Button variant="outline" render={<Link to="/">Ke Beranda</Link>} />
      </div>
    </div>
  );
}
