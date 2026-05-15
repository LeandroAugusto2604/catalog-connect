import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { CartDrawer } from "@/components/cart-drawer";
import { useState } from "react";

export function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span
            className="inline-block h-7 w-7 rounded-lg"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          />
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
            Catálogo Digital
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="relative"
            onClick={() => setOpen(true)}
            aria-label="Abrir carrinho"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Carrinho</span>
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Button>
        </div>
      </div>
      <CartDrawer open={open} onOpenChange={setOpen} />
    </header>
  );
}