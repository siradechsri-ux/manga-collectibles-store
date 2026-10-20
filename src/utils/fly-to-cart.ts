"use client";

export interface FlyToCartDetail {
  startX: number;
  startY: number;
  imageUrl?: string | null;
}

export const FLY_TO_CART_EVENT = "app:fly-to-cart";

/**
 * Triggers a flying product animation from the clicked element/event towards the cart button in the Navbar.
 */
export function triggerFlyToCart(
  targetOrEvent?: React.MouseEvent | HTMLElement | { getBoundingClientRect: () => DOMRect } | null,
  imageUrl?: string | null,
): void {
  if (typeof window === "undefined") return;

  let startX = window.innerWidth / 2;
  let startY = window.innerHeight / 2;

  if (targetOrEvent) {
    if ("clientX" in targetOrEvent && typeof targetOrEvent.clientX === "number") {
      startX = targetOrEvent.clientX;
      startY = targetOrEvent.clientY;
    } else if ("currentTarget" in targetOrEvent && targetOrEvent.currentTarget instanceof HTMLElement) {
      const rect = targetOrEvent.currentTarget.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    } else if ("getBoundingClientRect" in targetOrEvent) {
      const rect = targetOrEvent.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    }
  }

  const event = new CustomEvent<FlyToCartDetail>(FLY_TO_CART_EVENT, {
    detail: {
      startX,
      startY,
      imageUrl: imageUrl || null,
    },
  });

  window.dispatchEvent(event);
}
