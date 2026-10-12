"use client";

import { ShoppingBag, Sparkles } from "lucide-react";
import CollectionCategoryCard from "./CollectionCategoryCard";
import { STORE_COLLECTIONS } from "../lib/store-collections";

export default function StorefrontHome() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl pb-16">
        <section className="relative isolate overflow-hidden rounded-3xl bg-zinc-950 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14 lg:px-14">
          <div className="absolute -right-16 -top-24 -z-10 h-80 w-80 rounded-full bg-orange-500/25 blur-3xl" />
          <div className="absolute -bottom-36 left-1/3 -z-10 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-orange-200">
                <Sparkles size={14} aria-hidden="true" />
                มังงะ · ไลท์โนเวล · ฟิกเกอร์ · กันพลา · กู้ดส์ · อุปกรณ์ดูแล
              </span>
              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
                อ่านสนุก ครบทุกเรื่อง
                <br />
                <span className="text-orange-400">สะสมของแท้ ส่งถึงบ้าน</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">
                ศูนย์รวมมังงะ ไลท์โนเวล ฟิกเกอร์ โมเดลกันพลา สินค้าคาแรคเตอร์
                และอุปกรณ์ถนอมของสะสม พร้อมจัดส่งถึงบ้าน
              </p>
            </div>
            <div className="hidden min-h-52 items-center justify-center lg:flex">
              <div className="relative flex h-48 w-56 items-center justify-center rounded-2xl border border-white/15 bg-white/5 shadow-2xl backdrop-blur-sm">
                <div className="absolute -right-6 -top-5 h-24 w-24 rotate-6 rounded-xl border border-orange-300/30 bg-orange-500/20" />
                <div className="absolute -bottom-5 -left-5 h-24 w-24 -rotate-6 rounded-xl border border-sky-300/30 bg-sky-500/15" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg">
                  <ShoppingBag size={34} strokeWidth={1.7} aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="browse-collection" className="mt-10 scroll-mt-24" aria-labelledby="catalog-heading">
          <header className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-400">
              Browse collection
            </p>
            <h2 id="catalog-heading" className="mt-1 text-2xl font-black text-zinc-950 dark:text-zinc-100 sm:text-3xl">
              เลือกดูตามหมวดสินค้า
            </h2>
          </header>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STORE_COLLECTIONS.map((collection) => (
              <CollectionCategoryCard key={collection.slug} collection={collection} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}