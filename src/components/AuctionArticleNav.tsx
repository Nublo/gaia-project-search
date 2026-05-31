"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const articles = [
  { label: "2 Player", href: "/auction-rules/2p" },
  { label: "3 Player", href: "/auction-rules/3p" },
  { label: "4 Player", href: "/auction-rules/4p" },
];

function useArticleNav() {
  const pathname = usePathname();
  const currentIndex = articles.findIndex((a) => a.href === pathname);
  return {
    pathname,
    prev: currentIndex > 0 ? articles[currentIndex - 1] : null,
    next: currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null,
  };
}

export function AuctionArticleTabs() {
  const { pathname } = useArticleNav();
  return (
    <nav className="flex gap-1 border-b border-gray-200 mb-8">
      {articles.map((article) => {
        const active = pathname === article.href;
        return (
          <Link
            key={article.href}
            href={article.href}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              active
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {article.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AuctionArticlePrevNext() {
  const { prev, next } = useArticleNav();
  return (
    <div className="flex justify-between mt-12 pt-6 border-t border-gray-200">
      {prev ? (
        <Link
          href={prev.href}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <span>←</span>
          <span>{prev.label}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <span>{next.label}</span>
          <span>→</span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
