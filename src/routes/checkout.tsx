import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { createQuote } from "@/lib/quotes.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Checkout — Solicitar orçamento" }] }),
});

const schema = z.object({
  customer_name: z.string().trim().min(1, "Informe seu nome"),
  customer_email: z.string().trim().email("E-mail inválido"),
  customer_whatsapp: z.string().trim().min(8, "WhatsApp inválido"),
  customer_address: z.string().trim().min(5, "Informe seu endereço"),
});

function Checkout() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const submit = useServerFn(createQuote);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_whatsapp: "",
    customer_address: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const result = await submit({
        data: {
          ...parsed.data,
          items: items.map((i) => ({
            product_id: i.id,
            product_name: i.name,
            unit_price: i.price,
            quantity: i.quantity,
          })),
        },
      });
      clear();
      toast.success("Orçamento enviado!");
      navigate({ to: "/orcamento/$id", params: { id: result.id } });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar orçamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <h1 className="mb-6 text-2xl font-bold">Seus dados</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={form.customer_name}
                onChange={(e) =>
                  setForm({ ...form, customer_name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.customer_email}
                onChange={(e) =>
                  setForm({ ...form, customer_email: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                placeholder="(11) 99999-9999"
                value={form.customer_whatsapp}
                onChange={(e) =>
                  setForm({ ...form, customer_whatsapp: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Textarea
                id="address"
                rows={3}
                value={form.customer_address}
                onChange={(e) =>
                  setForm({ ...form, customer_address: e.target.value })
                }
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando…" : "Enviar orçamento"}
            </Button>
          </form>
        </Card>

        <Card className="h-fit p-6">
          <h2 className="mb-4 text-lg font-semibold">Resumo do pedido</h2>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Carrinho vazio.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>
                    {i.quantity}x {i.name}
                  </span>
                  <span>{formatBRL(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-between border-t pt-4 font-semibold">
            <span>Total</span>
            <span>{formatBRL(total)}</span>
          </div>
        </Card>
      </main>
    </div>
  );
}