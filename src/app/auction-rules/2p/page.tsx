import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { readFileSync } from "fs";
import { join } from "path";
import { Spoiler } from "@/components/Spoiler";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "2 Player Auction Rules — Gaia Project",
};

const components = { Spoiler };

export default function Page() {
  const source = readFileSync(join(process.cwd(), "src/content/auction-2p.mdx"), "utf8");
  return <MDXRemote source={source} components={components} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />;
}
