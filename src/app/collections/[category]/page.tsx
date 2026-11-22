import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import CollectionListing from "../../../components/CollectionListing";
import { STORE_COLLECTIONS } from "../../../lib/store-collections";

export default async function CollectionCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { category: slug } = await params;
  const { status } = await searchParams;

  if (slug === "best-sellers") {
    redirect("/collections/manga?filter=best-seller");
  }

  if (slug === "plamo") {
    redirect("/collections/gunpla");
  }

  const collection = STORE_COLLECTIONS.find(
    (item) => item.slug === slug || (slug === "plamo" && item.slug === "gunpla")
  );

  if (!collection) notFound();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-zinc-500">
          กำลังโหลดรายการสินค้า...
        </div>
      }
    >
      <CollectionListing
        collection={collection}
        initialStatus={status === "PREORDER" ? "PREORDER" : "ALL"}
      />
    </Suspense>
  );
}
