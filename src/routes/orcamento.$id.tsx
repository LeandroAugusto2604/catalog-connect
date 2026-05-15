import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/orcamento/$id")({
  component: Confirmation,
  head: () => ({ meta: [{ title: "Orçamento enviado" }] }),
});

function Confirmation() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-16">
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Orçamento enviado!</h1>
          <p className="mt-2 text-muted-foreground">
            Recebemos seu pedido. Em breve entraremos em contato.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Número do pedido: <span className="font-mono">{id.slice(0, 8)}</span>
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar ao catálogo</Link>
          </Button>
        </Card>
      </main>
    </div>
  );
}