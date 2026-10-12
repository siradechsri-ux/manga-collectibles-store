import { STORE_COLLECTIONS } from "./store-collections";

export function getSafeCollectionReturnPath(value: string | null): string {
  if (!value) return "/";

  try {
    const url = new URL(value, "https://store.invalid");
    const validCollection = STORE_COLLECTIONS.some(
      (collection) => url.pathname === `/collections/${collection.slug}`,
    );
    if (url.origin !== "https://store.invalid" || !validCollection) return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}