import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

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
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Nosso catálogo
          </h1>
          <p className="mt-2 text-muted-foreground">
            Adicione os produtos ao carrinho e solicite seu orçamento personalizado.
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando produtos…</p>
        ) : !data || data.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            Nenhum produto cadastrado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => (
              <Card
                key={p.id}
                className="overflow-hidden p-0 transition-shadow hover:shadow-lg"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h2 className="font-semibold leading-tight">{p.name}</h2>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {formatBRL(Number(p.price))}
                    </span>
                    <Button
                      size="sm"
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
