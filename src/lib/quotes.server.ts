import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "leandro.soneca186@gmail.com";

type QuoteItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type Customer = {
  name: string;
  email: string;
  whatsapp: string;
  address: string;
};

export async function sendQuoteEmails(payload: {
  quoteId: string;
  customer: Customer;
  items: QuoteItem[];
  total: number;
}) {
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
  const { error } = await supabaseAdmin.rpc("enqueue_email" as never, {
    queue_name: "transactional_emails",
    payload: args,
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
  items: QuoteItem[];
  total: number;
  contact: Customer;
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