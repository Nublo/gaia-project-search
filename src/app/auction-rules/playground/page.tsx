import type { Metadata } from "next";
import AuctionPlayground from "@/components/AuctionPlayground";

export const metadata: Metadata = {
  title: "Auction Playground — Gaia Project",
};

export default function Page() {
  return (
    <>
      <h1>Auction Playground</h1>
      <p>
        Pick the factions, set each player&apos;s bids and see who gets which faction, how many VP they pay and why.
        New to BGA auctions? Start with the <a href="/auction-rules/2p">2 player rules</a>.
      </p>
      <AuctionPlayground />
    </>
  );
}
