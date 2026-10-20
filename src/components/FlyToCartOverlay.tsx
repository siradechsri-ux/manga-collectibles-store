"use client";

import { useEffect, useState } from "react";
import { FLY_TO_CART_EVENT, type FlyToCartDetail } from "../utils/fly-to-cart";
import { ShoppingBag } from "lucide-react";

interface Particle {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  imageUrl?: string | null;
}

export default function FlyToCartOverlay() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const handleFly = (e: Event) => {
      const customEvent = e as CustomEvent<FlyToCartDetail>;
      if (!customEvent.detail) return;

      const { startX, startY, imageUrl } = customEvent.detail;

      // Find navbar cart button position
      const cartBtn = document.getElementById("navbar-cart-button");
      let targetX = window.innerWidth - 80;
      let targetY = 32;

      if (cartBtn) {
        const rect = cartBtn.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }

      const id = Date.now() + Math.random();
      const newParticle: Particle = {
        id,
        startX,
        startY,
        targetX,
        targetY,
        imageUrl,
      };

      setParticles((prev) => [...prev, newParticle]);

      // Remove particle after animation duration
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));

        // Bounce cart button
        if (cartBtn) {
          cartBtn.classList.remove("animate-cart-bounce");
          void cartBtn.offsetWidth; // trigger reflow
          cartBtn.classList.add("animate-cart-bounce");
          setTimeout(() => {
            cartBtn.classList.remove("animate-cart-bounce");
          }, 450);
        }
      }, 700);
    };

    window.addEventListener(FLY_TO_CART_EVENT, handleFly);
    return () => window.removeEventListener(FLY_TO_CART_EVENT, handleFly);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
    >
      <style>{`
        @keyframes flyToCartX {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(var(--fly-x));
          }
        }
        @keyframes flyToCartY {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          35% {
            transform: translateY(calc(var(--fly-y) * 0.2 - 60px)) scale(1.15);
            opacity: 0.95;
          }
          85% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(var(--fly-y)) scale(0.25);
            opacity: 0.1;
          }
        }
        .animate-cart-bounce {
          animation: cartBadgePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes cartBadgePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.22); }
          100% { transform: scale(1); }
        }
      `}</style>

      {particles.map((p) => {
        const dx = p.targetX - p.startX;
        const dy = p.targetY - p.startY;

        return (
          <div
            key={p.id}
            style={
              {
                position: "absolute",
                left: `${p.startX}px`,
                top: `${p.startY}px`,
                "--fly-x": `${dx}px`,
                animation: "flyToCartX 0.65s cubic-bezier(0.25, 0.9, 0.35, 1) forwards",
              } as React.CSSProperties
            }
          >
            <div
              style={
                {
                  "--fly-y": `${dy}px`,
                  animation: "flyToCartY 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                } as React.CSSProperties
              }
              className="flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-2xl border-2 border-orange-500 bg-white shadow-xl shadow-orange-500/30 dark:bg-zinc-900"
            >
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-orange-600 text-white">
                  <ShoppingBag size={20} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
