import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "leandro.soneca186@gmail.com";

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
    // Recompute prices server-side from products table to avoid client tampering
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

    // Try to send confirmation emails (non-blocking)
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
      console.error("Falha ao enviar e-mails de confirmação:", e);
    }

    return { id: quote.id, total };
  });

async function sendQuoteEmails(payload: {
  quoteId: string;
  customer: { name: string; email: string; whatsapp: string; address: string };
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  total: number;
}) {
  // Enqueue both emails via the email queue (works once email infra is set up).
  const { customer, items, total, quoteId } = payload;
  const itemsText = items
    .map(
      (i) =>
        `• ${i.quantity}x ${i.product_name} — R$ ${i.subtotal.toFixed(2)}`,
    )
    .join("\n");

  const customerHtml = renderEmailHtml({
    title: "Recebemos seu orçamento!",
    intro: `Olá ${escapeHtml(customer.name)}, recebemos seu pedido de orçamento e em breve entraremos em contato.`,
    items,
    total,
    contact: customer,
    showContact: false,
  });

  const adminHtml = renderEmailHtml({
    title: "Novo orçamento recebido",
    intro: `Pedido #${quoteId.slice(0, 8)} de ${escapeHtml(customer.name)}.`,
    items,
    total,
    contact: customer,
    showContact: true,
  });

  // Try queue-based send (requires email infra). If it fails, swallow.
  await Promise.allSettled([
    enqueueEmail({
      to: customer.email,
      subject: "Recebemos seu orçamento",
      html: customerHtml,
      text: `Olá ${customer.name},\n\nRecebemos seu orçamento. Itens:\n${itemsText}\n\nTotal: R$ ${total.toFixed(2)}\n\nEm breve entraremos em contato.`,
    }),
    enqueueEmail({
      to: ADMIN_EMAIL,
      subject: `Novo orçamento — ${customer.name}`,
      html: adminHtml,
      text: `Novo orçamento de ${customer.name} (${customer.email}, ${customer.whatsapp})\nEndereço: ${customer.address}\n\n${itemsText}\n\nTotal: R$ ${total.toFixed(2)}`,
    }),
  ]);
}

async function enqueueEmail(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  // Use the pgmq enqueue_email RPC created by setup_email_infra.
  // If the RPC doesn't exist yet, this will error; caller swallows it.
  const { error } = await supabaseAdmin.rpc("enqueue_email" as never, {
    queue_name: "transactional_emails",
    payload: {
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    },
  } as never);
  if (error) throw error;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEmailHtml(opts: {
  title: string;
  intro: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  total: number;
  contact: { name: string; email: string; whatsapp: string; address: string };
  showContact: boolean;
}) {
  const rows = opts.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.quantity}x ${escapeHtml(i.product_name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">R$ ${i.subtotal.toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  const contactBlock = opts.showContact
    ? `<div style="margin-top:24px;padding:16px;background:#f8f5f0;border-radius:8px;">
        <p style="margin:0 0 8px;"><strong>Cliente:</strong> ${escapeHtml(opts.contact.name)}</p>
        <p style="margin:0 0 8px;"><strong>E-mail:</strong> ${escapeHtml(opts.contact.email)}</p>
        <p style="margin:0 0 8px;"><strong>WhatsApp:</strong> ${escapeHtml(opts.contact.whatsapp)}</p>
        <p style="margin:0;"><strong>Endereço:</strong> ${escapeHtml(opts.contact.address)}</p>
       </div>`
    : "";

  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;background:#ffffff;color:#222;padding:24px;">
  <div style="max-width:600px;margin:0 auto;">
    <h1 style="font-size:22px;margin:0 0 16px;">${escapeHtml(opts.title)}</h1>
    <p style="font-size:14px;line-height:1.5;margin:0 0 16px;">${opts.intro}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
      ${rows}
      <tr>
        <td style="padding:12px 0;font-weight:bold;">Total</td>
        <td style="padding:12px 0;text-align:right;font-weight:bold;">R$ ${opts.total.toFixed(2)}</td>
      </tr>
    </table>
    ${contactBlock}
  </div>
</body></html>`;
}