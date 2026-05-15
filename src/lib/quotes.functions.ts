import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendQuoteEmails } from "@/lib/quotes.server";

const createQuoteSchema = z.object({
  customer_name: z.string().trim().min(1).max(200),
  customer_email: z.string().trim().email().max(320),
  customer_whatsapp: z.string().trim().min(5).max(40),
  customer_address: z.string().trim().min(1).max(1000),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        product_name: z.string().min(1).max(300),
        unit_price: z.number().min(0),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(100),
});

export const createQuote = createServerFn({ method: "POST" })
  .inputValidator((input) => createQuoteSchema.parse(input))
  .handler(async ({ data }) => {
    const ids = data.items.map((i) => i.product_id);
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("id, name, price, active")
      .in("id", ids);

    if (prodErr) throw new Error("Falha ao validar produtos");
    const priceMap = new Map(
      (products ?? [])
        .filter((p) => p.active)
        .map((p) => [p.id, { name: p.name, price: Number(p.price) }]),
    );

    const safeItems = data.items
      .map((i) => {
        const p = priceMap.get(i.product_id);
        if (!p) return null;
        return {
          product_id: i.product_id,
          product_name: p.name,
          unit_price: p.price,
          quantity: i.quantity,
          subtotal: Number((p.price * i.quantity).toFixed(2)),
        };
      })
      .filter(Boolean) as Array<{
      product_id: string;
      product_name: string;
      unit_price: number;
      quantity: number;
      subtotal: number;
    }>;

    if (safeItems.length === 0) {
      throw new Error("Nenhum produto válido no carrinho");
    }

    const total = Number(
      safeItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2),
    );

    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_whatsapp: data.customer_whatsapp,
        customer_address: data.customer_address,
        total,
      })
      .select("id")
      .single();

    if (qErr || !quote) throw new Error("Falha ao salvar orçamento");

    const { error: itemsErr } = await supabaseAdmin.from("quote_items").insert(
      safeItems.map((i) => ({ ...i, quote_id: quote.id })),
    );
    if (itemsErr) throw new Error("Falha ao salvar itens do orçamento");

    try {
      await sendQuoteEmails({
        quoteId: quote.id,
        customer: {
          name: data.customer_name,
          email: data.customer_email,
          whatsapp: data.customer_whatsapp,
          address: data.customer_address,
        },
        items: safeItems,
        total,
      });
    } catch (e) {
      console.error("Falha ao enviar e-mails:", e);
    }

    return { id: quote.id, total };
  });
