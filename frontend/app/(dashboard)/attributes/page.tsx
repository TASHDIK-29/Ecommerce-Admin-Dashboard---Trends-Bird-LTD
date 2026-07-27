"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AttributesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Attributes" description="This screen is built in a later step." />
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          The Attributes screen is not built yet. You reached it because your role holds{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">attribute:watch</code>.
        </CardContent>
      </Card>
    </div>
  );
}
