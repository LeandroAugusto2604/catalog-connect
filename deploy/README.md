# Deploy do catálogo na VPS — `catalogo.leandroaugusto.space`

Este guia te leva do zero até o app rodando em produção numa VPS Ubuntu/Debian, atrás do Nginx + Let's Encrypt, usando seu próprio Supabase como backend.

## 0. Pré-requisitos

- VPS Ubuntu 22.04+ ou Debian 12+ com acesso `sudo`.
- Domínio `leandroaugusto.space` apontando para a VPS — crie um registro **A** `catalogo` → IP da sua VPS no painel do seu provedor de DNS.
- Conta no [Supabase](https://supabase.com) (plano Free serve) com um projeto novo criado.
- Repositório do projeto clonado na VPS (`git clone …` em `/opt/catalogo` por exemplo).

---

## 1. Configurar seu Supabase próprio

1. Acesse o **SQL Editor** do seu projeto Supabase, cole o conteúdo de [`deploy/schema.sql`](./schema.sql) e clique em **Run**. Isso cria todas as tabelas, RLS e triggers.
2. Em **Authentication → Providers**:
   - Habilite **Email** (signup com confirmação se quiser).
   - (Opcional) Habilite **Google** com seu Client ID/Secret se quiser login social.
3. Em **Authentication → URL Configuration**, defina:
   - **Site URL**: `https://catalogo.leandroaugusto.space`
   - **Redirect URLs**: `https://catalogo.leandroaugusto.space/**`
4. Em **Project Settings → API**, copie:
   - `Project URL` → vai em `SUPABASE_URL` e `VITE_SUPABASE_URL`
   - `anon public key` → vai em `SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `service_role key` → vai em `SUPABASE_SERVICE_ROLE_KEY` (NUNCA exponha)
   - `Reference ID` → vai em `VITE_SUPABASE_PROJECT_ID`

---

## 2. Ajustar envio de e-mail (Gmail SMTP)

A integração atual usa o **conector Gmail da Lovable**, que só funciona dentro da infra Lovable. Para rodar na sua VPS você tem duas opções:

### Opção mais simples — Senha de app do Gmail
1. Ative a verificação em 2 etapas em https://myaccount.google.com/security
2. Gere uma **Senha de app** em https://myaccount.google.com/apppasswords (16 caracteres).
3. Preencha `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_EMAIL` em `deploy/.dev.vars`.
4. Será necessário **reescrever `src/lib/quotes.server.ts`** para usar SMTP em vez do gateway da Lovable. Posso fazer essa reescrita pra você num próximo passo — é só pedir.

### Alternativa — Resend / Mailgun / SES
Se preferir um serviço transacional, me peça que eu adapto o código.

---

## 3. Preparar a VPS

```bash
# Docker + compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Nginx + Certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## 4. Configurar variáveis e subir o container

Na pasta do projeto, dentro da VPS:

```bash
cd /opt/catalogo

# Variáveis de BUILD (embutidas no bundle JS)
cp deploy/.env.example deploy/.env
nano deploy/.env                 # preencher VITE_*

# Variáveis de RUNTIME do worker (server-only)
cp deploy/.dev.vars.example deploy/.dev.vars
nano deploy/.dev.vars            # preencher SUPABASE_* e SMTP_*
chmod 600 deploy/.dev.vars       # boas práticas: ninguém mais lê

# Subir
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
```

Confira que respondeu local:

```bash
curl -I http://127.0.0.1:3000
# Esperado: HTTP/1.1 200 OK
```

Logs em tempo real: `docker logs -f catalogo-app`

---

## 5. Nginx + HTTPS

```bash
sudo cp deploy/nginx/catalogo.leandroaugusto.space.conf \
        /etc/nginx/sites-available/catalogo.leandroaugusto.space
sudo ln -s /etc/nginx/sites-available/catalogo.leandroaugusto.space \
           /etc/nginx/sites-enabled/
sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx

# Emite o certificado e já edita o nginx
sudo certbot --nginx -d catalogo.leandroaugusto.space \
     --non-interactive --agree-tos -m leandro.soneca186@gmail.com

# Renovação automática
sudo certbot renew --dry-run
```

Pronto — abra https://catalogo.leandroaugusto.space no navegador.

---

## 6. Atualizar o app depois

```bash
cd /opt/catalogo
git pull
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
```

---

## 7. Criar o usuário admin

1. Abra `https://catalogo.leandroaugusto.space/login` e faça signup com seu e-mail.
2. No Supabase → **Authentication → Users**, copie o `UUID` do usuário recém-criado.
3. No **SQL Editor**:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('COLE-O-UUID-AQUI', 'admin');
   ```
4. Faça login → `/admin` agora abre o painel.

---

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `502 Bad Gateway` no Nginx | Container caiu | `docker logs catalogo-app` |
| Página em branco no `/admin` | Esqueceu o passo 7 | Inserir role `admin` no SQL |
| Login não funciona | URL não configurada no Supabase | Refazer passo 1.3 |
| Build falha por falta de `VITE_*` | `.env` vazio | Preencher `deploy/.env` antes do `up --build` |
| E-mail de orçamento não chega | Código ainda usa gateway Lovable | Pedir refator pra SMTP (passo 2) |