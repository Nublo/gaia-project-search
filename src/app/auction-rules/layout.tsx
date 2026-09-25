import { AuctionArticleTabs, AuctionArticlePrevNext } from "@/components/AuctionArticleNav";

export default function AuctionRulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <AuctionArticleTabs />
        <article className="prose prose-gray max-w-none">{children}</article>
        <AuctionArticlePrevNext />
      </main>
    </div>
  );
}
