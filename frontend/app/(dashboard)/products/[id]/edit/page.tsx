"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { ProductForm } from "@/components/products/product-form";
import { DataState } from "@/components/shared/data-state";
import { Forbidden } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useProduct } from "@/hooks/use-products";
import { useAuth } from "@/lib/auth-context";

/** Next 16 hands `params` over as a Promise, read here with React's `use()`. */
export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAuth();
  const query = useProduct(id);

  if (!can("product:update")) {
    return <Forbidden permission="product:update" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={query.data ? query.data.name : "Edit product"}
        description="Details and organisation save together. Media and variants apply immediately."
        actions={
          <Button variant="outline" asChild>
            <Link href="/products">
              <ArrowLeft className="size-4" aria-hidden />
              Back to products
            </Link>
          </Button>
        }
      />

      <DataState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        loadingRows={8}
      >
        {query.data ? <ProductForm product={query.data} /> : null}
      </DataState>
    </div>
  );
}
