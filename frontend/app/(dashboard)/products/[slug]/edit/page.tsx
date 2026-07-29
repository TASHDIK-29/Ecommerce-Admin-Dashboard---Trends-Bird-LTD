"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { ProductForm } from "@/components/products/product-form";
import { DataState } from "@/components/shared/data-state";
import { Forbidden } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useProductBySlug } from "@/hooks/use-products";
import { useAuth } from "@/lib/auth-context";

/**
 * Next 16 hands `params` over as a Promise, read here with React's `use()`.
 * The route carries the slug rather than the id, so the surrogate key stays out
 * of the address bar; the id arrives inside the payload for the mutations.
 */
export default function EditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { can } = useAuth();
  const query = useProductBySlug(slug);

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
