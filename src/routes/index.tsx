import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import { Sparkles, ShoppingBag, Truck, ShieldCheck, Plus } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { add } = useCart();
  const { data, isLoading } = useQuery({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, description, image_url")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Orçamento rápido e sem compromisso
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">
            Descubra produtos selecionados a um clique do seu orçamento.
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/85 sm:text-lg">
            Monte seu pedido, envie em segundos e receba uma resposta personalizada no seu WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-white text-foreground shadow-xl hover:bg-white/90"
              onClick={() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" })}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Ver catálogo
            </Button>
          </div>

          <div className="mt-12 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Truck, label: "Entrega ágil" },
              { icon: ShieldCheck, label: "Compra segura" },
              { icon: Sparkles, label: "Atendimento humano" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur"
              >
                <Icon className="h-4 w-4" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catálogo */}
      <main id="catalogo" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Catálogo
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Nossos produtos
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Selecione o que precisa, monte seu carrinho e finalize seu orçamento.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              Nenhum produto cadastrado ainda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => (
              <Card
                key={p.id}
                className="group relative overflow-hidden border-border/60 p-0 transition-all duration-300 hover:-translate-y-1"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ background: "var(--gradient-subtle)" }}
                    >
                      <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold leading-tight tracking-tight">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span
                      className="text-xl font-bold bg-clip-text text-transparent"
                      style={{ backgroundImage: "var(--gradient-gold)" }}
                    >
                      {formatBRL(Number(p.price))}
                    </span>
                    <Button
                      size="sm"
                      className="shadow-md transition-shadow hover:shadow-lg"
                      style={{ background: "var(--gradient-primary)" }}
                      onClick={() => {
                        add({
                          id: p.id,
                          name: p.name,
                          price: Number(p.price),
                          image_url: p.image_url,
                        });
                        toast.success(`${p.name} adicionado ao carrinho`);
                      }}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
