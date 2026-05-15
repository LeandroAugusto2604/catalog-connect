import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";

export function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { items, total, setQuantity, remove } = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Seu carrinho</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Seu carrinho está vazio. Adicione produtos do catálogo.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-16 w-16 rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-muted" />
                  )}
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">
                        {item.name}
                      </p>
                      <button
                        onClick={() => remove(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatBRL(item.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() =>
                          setQuantity(item.id, item.quantity - 1)
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() =>
                          setQuantity(item.id, item.quantity + 1)
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatBRL(total)}</span>
            </div>
            <Button
              asChild
              className="w-full"
              disabled={items.length === 0}
            >
              <Link
                to="/checkout"
                onClick={() => onOpenChange(false)}
                aria-disabled={items.length === 0}
              >
                Finalizar orçamento
              </Link>
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}