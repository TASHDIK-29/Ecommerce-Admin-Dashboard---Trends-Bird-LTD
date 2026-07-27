"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function EditProductPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit product"
        description="The product form is built in the next step."
        actions={
          <Button variant="outline" asChild>
            <Link href="/products">
              <ArrowLeft className="size-4" aria-hidden />
              Back to products
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          The product form, with variants and media, lands in the next step.
        </CardContent>
      </Card>
    </div>
  );
}
