"use client";

import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Boxes,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { STORE_COLLECTIONS } from "../lib/store-collections";

export default function BentoCategoryGrid() {
  const mangaCollection = STORE_COLLECTIONS.find((c) => c.slug === 'manga')!;
  const lnCollection = STORE_COLLECTIONS.find((c) => c.slug === 'light-novel')!;
  const figureCollection = STORE_COLLECTIONS.find((c) => c.slug === 'figures')!;
  const goodsCollection = STORE_COLLECTIONS.find((c) => c.slug === 'goods')!;
  const accCollection = STORE_COLLECTIONS.find((c) => c.slug === 'accessories')!;

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {/* ===================== [1. MANGA: Wide Hero Bento (lg:col-span-2)] ===================== */}
      <Link
        href={`/collections/${mangaCollection.slug}`}
        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-white via-orange-50/20 to-amber-50/30 p-6 sm:p-8 shadow-xs transition duration-300 hover:-translate-y-1.5 hover:border-orange-400 hover:shadow-xl dark:border-zinc-800 dark:bg-gradient-to-br dark:from-zinc-900 dark:via-zinc-900 dark:to-orange-950/20 dark:hover:border-orange-500 lg:col-span-2"
      >
        <div className="grid items-center gap-6 sm:grid-cols-12">
          {/* Left Content (7 Cols) */}
          <div className="flex flex-col justify-between sm:col-span-7">
            <div>
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                  {mangaCollection.featureBadge}
                </span>
                <span className="rounded-lg border border-orange-200/90 bg-orange-100/80 px-2 py-0.5 text-[11px] font-bold text-orange-800 shadow-2xs dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300">
                  {mangaCollection.itemCountText}
                </span>
              </div>

              {/* Header */}
              <div className="mt-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                <BookOpen size={14} aria-hidden="true" />
                <span>{mangaCollection.subtitle}</span>
              </div>

              <h3 className="mt-1.5 text-2xl font-black text-zinc-900 transition group-hover:text-orange-600 dark:text-zinc-100 dark:group-hover:text-orange-400 sm:text-3xl">
                {mangaCollection.title}
              </h3>

              <p className="mt-2 max-w-md text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {mangaCollection.description}
              </p>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {mangaCollection.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Action CTA */}
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-white shadow-xs transition group-hover:bg-orange-700">
                เลือกดูมังงะทั้งหมด
                <ArrowRight
                  size={14}
                  className="transform transition duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </div>
          </div>

          {/* Right Visual: 3D Fanned-Out Manga Covers (5 Cols) */}
          <div className="relative flex h-56 sm:h-64 items-center justify-center sm:col-span-5">
            {/* Book 1 (Left Tilt) */}
            <img
              src={`/images/products/${mangaCollection.previewImages[0]}`}
              alt="Manga volume 1"
              className="absolute h-40 sm:h-48 w-auto rounded-md object-contain shadow-xl drop-shadow-md -rotate-10 -translate-x-10 sm:-translate-x-12 transition-all duration-500 group-hover:-rotate-14 group-hover:-translate-x-14 group-hover:scale-105"
            />
            {/* Book 3 (Right Tilt) */}
            <img
              src={`/images/products/${mangaCollection.previewImages[2] ?? mangaCollection.previewImages[1]}`}
              alt="Manga volume 3"
              className="absolute h-40 sm:h-48 w-auto rounded-md object-contain shadow-xl drop-shadow-md rotate-10 translate-x-10 sm:translate-x-12 transition-all duration-500 group-hover:rotate-14 group-hover:translate-x-14 group-hover:scale-105"
            />
            {/* Book 2 (Center Hero) */}
            <img
              src={`/images/products/${mangaCollection.previewImages[1] ?? mangaCollection.previewImages[0]}`}
              alt="Manga volume 2"
              className="relative z-10 h-44 sm:h-52 w-auto rounded-md object-contain shadow-2xl drop-shadow-lg transition-all duration-500 group-hover:scale-110"
            />
          </div>
        </div>
      </Link>

      {/* ===================== [2. LIGHT NOVEL: Bento Card (lg:col-span-1)] ===================== */}
      <Link
        href={`/collections/${lnCollection.slug}`}
        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-white via-sky-50/20 to-sky-50/30 p-6 shadow-xs transition duration-300 hover:-translate-y-1.5 hover:border-sky-400 hover:shadow-xl dark:border-zinc-800 dark:bg-gradient-to-br dark:from-zinc-900 dark:via-zinc-900 dark:to-sky-950/20 dark:hover:border-sky-500 lg:col-span-1"
      >
        <div>
          {/* Badges */}
          <div className="flex items-center justify-between">
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
              {lnCollection.featureBadge}
            </span>
            <span className="rounded-lg border border-sky-200/90 bg-sky-100/80 px-2 py-0.5 text-[11px] font-bold text-sky-800 shadow-2xs dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300">
              {lnCollection.itemCountText}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
            <BookMarked size={14} aria-hidden="true" />
            <span>{lnCollection.subtitle}</span>
          </div>

          <h3 className="mt-1 text-xl font-black text-zinc-900 transition group-hover:text-sky-600 dark:text-zinc-100 dark:group-hover:text-sky-400">
            {lnCollection.title}
          </h3>

          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {lnCollection.description}
          </p>

          {/* Visual: Layered Covers */}
          <div className="relative my-4 flex h-48 items-center justify-center overflow-hidden">
            <img
              src={`/images/products/${lnCollection.previewImages[1] ?? lnCollection.previewImages[0]}`}
              alt="Light novel volume 2"
              className="absolute h-40 w-auto rounded-md object-contain shadow-lg drop-shadow-md rotate-6 translate-x-4 opacity-85 transition-all duration-500 group-hover:rotate-10 group-hover:translate-x-6 group-hover:scale-105"
            />
            <img
              src={`/images/products/${lnCollection.previewImages[0]}`}
              alt="Light novel volume 1"
              className="relative z-10 h-44 w-auto rounded-md object-contain shadow-xl drop-shadow-md -rotate-3 transition-all duration-500 group-hover:rotate-0 group-hover:scale-105"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {lnCollection.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-bold text-sky-600 transition dark:border-zinc-800 dark:text-sky-400">
          <span>เลือกดูไลท์โนเวลทั้งหมด</span>
          <ArrowRight
            size={14}
            className="transform transition duration-300 group-hover:translate-x-1.5"
            aria-hidden="true"
          />
        </div>
      </Link>

      {/* ===================== [3. FIGURES: Bento Card (lg:col-span-1)] ===================== */}
      <Link
        href={`/collections/${figureCollection.slug}`}
        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 p-6 shadow-xs transition duration-300 hover:-translate-y-1.5 hover:border-emerald-400 hover:shadow-xl dark:border-zinc-800 dark:bg-gradient-to-br dark:from-zinc-900 dark:via-zinc-900 dark:to-emerald-950/20 dark:hover:border-emerald-500 lg:col-span-1"
      >
        <div>
          {/* Badges */}
          <div className="flex items-center justify-between">
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-2xs dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
              {figureCollection.featureBadge}
            </span>
            <span className="rounded-lg border border-emerald-200/90 bg-emerald-100/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800 shadow-2xs dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              {figureCollection.itemCountText}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Sparkles size={14} aria-hidden="true" />
            <span>{figureCollection.subtitle}</span>
          </div>

          <h3 className="mt-1 text-xl font-black text-zinc-900 transition group-hover:text-emerald-600 dark:text-zinc-100 dark:group-hover:text-emerald-400">
            {figureCollection.title}
          </h3>

          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {figureCollection.description}
          </p>

          {/* Visual: Figure centered */}
          <div className="my-4 flex h-48 items-center justify-center overflow-hidden">
            <img
              src={`/images/products/${figureCollection.previewImages[0]}`}
              alt="Figure collectible"
              className="h-44 w-auto object-contain drop-shadow-xl transition-all duration-500 group-hover:scale-110"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {figureCollection.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-bold text-emerald-600 transition dark:border-zinc-800 dark:text-emerald-400">
          <span>เลือกดูฟิกเกอร์ทั้งหมด</span>
          <ArrowRight
            size={14}
            className="transform transition duration-300 group-hover:translate-x-1.5"
            aria-hidden="true"
          />
        </div>
      </Link>

      {/* ===================== [4. GOODS: Bento Card (lg:col-span-1)] ===================== */}
      <Link
        href={`/collections/${goodsCollection.slug}`}
        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-white via-rose-50/20 to-pink-50/30 p-6 shadow-xs transition duration-300 hover:-translate-y-1.5 hover:border-rose-400 hover:shadow-xl dark:border-zinc-800 dark:bg-gradient-to-br dark:from-zinc-900 dark:via-zinc-900 dark:to-rose-950/20 dark:hover:border-rose-500 lg:col-span-1"
      >
        <div>
          {/* Badges */}
          <div className="flex items-center justify-between">
            <span className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800 shadow-2xs dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
              {goodsCollection.featureBadge}
            </span>
            <span className="rounded-lg border border-rose-200/90 bg-rose-100/80 px-2 py-0.5 text-[11px] font-bold text-rose-800 shadow-2xs dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
              {goodsCollection.itemCountText}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <ShoppingBag size={14} aria-hidden="true" />
            <span>{goodsCollection.subtitle}</span>
          </div>

          <h3 className="mt-1 text-xl font-black text-zinc-900 transition group-hover:text-rose-600 dark:text-zinc-100 dark:group-hover:text-rose-400">
            {goodsCollection.title}
          </h3>

          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {goodsCollection.description}
          </p>

          {/* Visual: Official Goods */}
          <div className="my-4 flex h-48 items-center justify-center overflow-hidden">
            <img
              src={`/images/products/${goodsCollection.previewImages[0]}`}
              alt="Official goods"
              className="h-44 w-auto object-contain drop-shadow-xl transition-all duration-500 group-hover:scale-110"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {goodsCollection.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-bold text-rose-600 transition dark:border-zinc-800 dark:text-rose-400">
          <span>เลือกดูกู้ดส์ทั้งหมด</span>
          <ArrowRight
            size={14}
            className="transform transition duration-300 group-hover:translate-x-1.5"
            aria-hidden="true"
          />
        </div>
      </Link>

      {/* ===================== [5. ACCESSORIES: Bento Card (lg:col-span-1)] ===================== */}
      <Link
        href={`/collections/${accCollection.slug}`}
        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30 p-6 shadow-xs transition duration-300 hover:-translate-y-1.5 hover:border-amber-400 hover:shadow-xl dark:border-zinc-800 dark:bg-gradient-to-br dark:from-zinc-900 dark:via-zinc-900 dark:to-amber-950/20 dark:hover:border-amber-500 lg:col-span-1"
      >
        <div>
          {/* Badges */}
          <div className="flex items-center justify-between">
            <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-800 shadow-2xs dark:border-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
              {accCollection.featureBadge}
            </span>
            <span className="rounded-lg border border-amber-200/90 bg-amber-100/80 px-2 py-0.5 text-[11px] font-bold text-amber-800 shadow-2xs dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              {accCollection.itemCountText}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>{accCollection.subtitle}</span>
          </div>

          <h3 className="mt-1 text-xl font-black text-zinc-900 transition group-hover:text-amber-600 dark:text-zinc-100 dark:group-hover:text-amber-400">
            {accCollection.title}
          </h3>

          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {accCollection.description}
          </p>

          {/* Visual: Care & Case */}
          <div className="my-4 flex h-48 items-center justify-center overflow-hidden">
            <img
              src={`/images/products/${accCollection.previewImages[0]}`}
              alt="Care and accessories"
              className="h-44 w-auto object-contain drop-shadow-xl transition-all duration-500 group-hover:scale-110"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {accCollection.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-bold text-amber-600 transition dark:border-zinc-800 dark:text-amber-400">
          <span>เลือกดูอุปกรณ์ดูแล</span>
          <ArrowRight
            size={14}
            className="transform transition duration-300 group-hover:translate-x-1.5"
            aria-hidden="true"
          />
        </div>
      </Link>
    </div>
  );
}
