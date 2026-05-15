import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";
import { Pencil, Trash2, Plus, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Painel administrativo" }] }),
});

function AdminPage() {
  const [session, setSession] = useState<{ userId: string } | null | undefined>(
    undefined,
  );
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ? { userId: s.user.id } : null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ? { userId: data.session.user.id } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(undefined);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  if (session === undefined) return null;
  if (session === null) return <LoginForm />;
  if (isAdmin === undefined)
    return (
      <div className="p-10 text-center text-muted-foreground">Carregando…</div>
    );
  if (!isAdmin) return <NotAdmin />;
  return <Dashboard />;
}

function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail se for solicitado.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-6 text-2xl font-bold">Painel Admin</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="pw">Senha</Label>
            <Input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Aguarde…"
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "login"
            ? "Não tem conta? Criar uma"
            : "Já tem conta? Entrar"}
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline">
            Voltar ao catálogo
          </Link>
        </p>
      </Card>
    </div>
  );
}

function NotAdmin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta ainda não tem permissão de administrador. Entre em contato
          com o responsável.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => supabase.auth.signOut()}
        >
          Sair
        </Button>
      </Card>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Painel administrativo</h1>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/">Ver loja</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/admin" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="quotes">Orçamentos</TabsTrigger>
          </TabsList>
          <TabsContent value="products" className="mt-6">
            <ProductsAdmin />
          </TabsContent>
          <TabsContent value="quotes" className="mt-6">
            <QuotesAdmin />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

interface ProductForm {
  id?: string;
  name: string;
  price: string;
  description: string;
  image_url: string;
  active: boolean;
}
const emptyProduct: ProductForm = {
  name: "",
  price: "",
  description: "",
  image_url: "",
  active: true,
};

function ProductsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyProduct);

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      description: form.description,
      image_url: form.image_url,
      active: form.active,
    };
    if (!payload.name || isNaN(payload.price) || payload.price < 0) {
      toast.error("Preencha nome e preço válido");
      return;
    }
    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Produto salvo");
    setOpen(false);
    setForm(emptyProduct);
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["products", "active"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Produto excluído");
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(emptyProduct)}>
              <Plus className="mr-2 h-4 w-4" /> Novo produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {form.id ? "Editar produto" : "Novo produto"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>URL da imagem</Label>
                <Input
                  value={form.image_url}
                  onChange={(e) =>
                    setForm({ ...form, image_url: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                Ativo (visível na loja)
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : !data || data.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum produto cadastrado.
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-right">Preço</th>
                <th className="p-3 text-center">Ativo</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-right">{formatBRL(Number(p.price))}</td>
                  <td className="p-3 text-center">{p.active ? "Sim" : "Não"}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setForm({
                          id: p.id,
                          name: p.name,
                          price: String(p.price),
                          description: p.description,
                          image_url: p.image_url,
                          active: p.active,
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QuotesAdmin() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, quote_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!data || data.length === 0)
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Nenhum orçamento recebido ainda.
      </Card>
    );

  return (
    <div className="space-y-4">
      {data.map((q) => (
        <Card key={q.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{q.customer_name}</h3>
              <p className="text-sm text-muted-foreground">
                {q.customer_email} · {q.customer_whatsapp}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {q.customer_address}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(q.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">
                {formatBRL(Number(q.total))}
              </p>
              <p className="text-xs uppercase text-muted-foreground">
                {q.status}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-1 border-t pt-3 text-sm">
            {(q.quote_items ?? []).map((it) => (
              <li key={it.id} className="flex justify-between">
                <span>
                  {it.quantity}x {it.product_name}
                </span>
                <span>{formatBRL(Number(it.subtotal))}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}