# Catálogo Digital e Orçamentos

## Resposta sobre e-mail
Gmail direto não dá (precisaria expor credenciais e o Google bloqueia envio em produção). A melhor opção, e que é nativa da plataforma, é **Lovable Emails** (built-in do Lovable Cloud / Supabase). Você só precisa apontar um subdomínio (ex: `notify.seudominio.com`) e os e-mails saem com seu domínio, sem API key externa. Vou usar essa solução. Se um dia quiser trocar por Resend/SMTP da VPS, é fácil substituir.

## Stack
- **Frontend/Backend:** TanStack Start (já configurado no projeto) — roda em Node na sua VPS sem problema.
- **Banco + Auth + Storage:** Lovable Cloud (Supabase Cloud gerenciado).
- **E-mails:** Lovable Emails (transacional).
- **Admin:** `leandro.soneca186@gmail.com` — você se cadastra via tela de login e eu te promovo a admin com um insert manual em `user_roles`.

## Páginas

### Públicas
- `/` — **Catálogo (Loja)**: grid responsivo de cards (imagem, título, descrição, preço, botão "Adicionar"). Header com ícone de carrinho (badge com quantidade). Carrinho em drawer lateral com itens, quantidades, total e botão "Finalizar orçamento".
- `/checkout` — **Checkout**: resumo do pedido + formulário (Nome, E-mail, WhatsApp com máscara, Endereço completo). Validação com Zod. Ao enviar: salva no banco e dispara dois e-mails (cliente + admin).
- `/orcamento/:id` — confirmação simples mostrando o número do pedido.

### Admin (`/admin`)
- `/admin/login` — login por e-mail/senha.
- `/admin` — dashboard com 2 abas:
  - **Produtos**: tabela com CRUD (criar, editar, excluir). Form: nome, preço, descrição, URL da imagem, ativo (sim/não).
  - **Orçamentos**: lista de pedidos recebidos, com expansão para ver itens, dados do cliente e status (novo / em andamento / concluído / cancelado).
- Rotas admin protegidas por layout `_authenticated` + checagem de role `admin` no `beforeLoad`.

## Banco de Dados (Supabase)

```text
products
  id, name, price (numeric), description, image_url, active (bool), created_at

quotes
  id, customer_name, customer_email, customer_whatsapp, customer_address,
  total (numeric), status (enum), created_at

quote_items
  id, quote_id (fk), product_id (fk), product_name (snapshot),
  unit_price (snapshot), quantity, subtotal

user_roles
  id, user_id (fk auth.users), role ('admin'|'user')
  + função has_role(uuid, role) SECURITY DEFINER
```

### RLS
- `products`: SELECT público (apenas `active=true` para anônimos); INSERT/UPDATE/DELETE só para admin.
- `quotes` / `quote_items`: INSERT público (cliente cria pedido sem login); SELECT só para admin.
- `user_roles`: SELECT do próprio usuário; gerenciado via SQL.

## E-mails
Dois templates React Email:
- `quote-customer-confirmation` — para o cliente: agradecimento + resumo do pedido + dados de contato.
- `quote-admin-notification` — para você (`leandro.soneca186@gmail.com`): novo orçamento recebido + itens + dados do cliente.

Disparados pelo server function que cria o orçamento (uma única transação: insert quote + items + enfileira e-mails).

## Fluxo de Implementação

1. Habilitar Lovable Cloud.
2. Criar migration: tabelas + enums + RLS + função `has_role` + trigger de `user_roles`.
3. Configurar domínio de e-mail (vou abrir o diálogo pra você apontar o DNS).
4. Scaffold de e-mails transacionais + criar os 2 templates.
5. Página `/` (catálogo) + carrinho (estado global com Zustand ou Context).
6. Página `/checkout` + server function `createQuote` que insere e dispara e-mails.
7. Auth + página `/admin/login`.
8. Layout `_authenticated/_admin` + páginas de gerenciamento de produtos e orçamentos.
9. Após você se cadastrar, rodo um INSERT em `user_roles` te promovendo a admin.
10. SEO básico (title/description por rota) + design system com tokens semânticos.

## Sobre hospedar na sua VPS
TanStack Start gera um servidor Node padrão (`bun run build` produz um output rodável). Você vai rodar com `node` ou PM2 atrás de Nginx. As variáveis `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ficam no `.env` da VPS apontando para o Supabase Cloud. Posso adicionar um `Dockerfile` + instruções de deploy ao final, se quiser.

## Pergunta final
Quer que eu inclua **Dockerfile + docker-compose + instruções de Nginx** para o deploy na VPS já no escopo, ou foco primeiro em ter o app funcionando e depois geramos os artefatos de deploy?