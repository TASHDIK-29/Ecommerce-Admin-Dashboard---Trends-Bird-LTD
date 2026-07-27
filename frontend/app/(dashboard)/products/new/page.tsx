"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ProductForm } from "@/components/products/product-form";
import { Forbidden } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function NewProductPage() {
  const { can } = useAuth();

  if (!can("product:create")) {
    return <Forbidden permission="product:create" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New product"
        description="Details, brand and categories, media, and variants — saved in one request."
        actions={
          <Button variant="outline" asChild>
            <Link href="/products">
              <ArrowLeft className="size-4" aria-hidden />
              Back to products
            </Link>
          </Button>
        }
      />

      <ProductForm />
    </div>
  );
}
