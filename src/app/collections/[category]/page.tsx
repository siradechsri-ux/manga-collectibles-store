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

  const collection = STORE_COLLECTIONS.find((item) => item.slug === slug);

  if (!collection) notFound();

  return (
    <CollectionListing
      collection={collection}
      initialStatus={status === "PREORDER" ? "PREORDER" : "ALL"}
    />
  );
}
