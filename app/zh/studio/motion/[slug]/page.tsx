import { notFound } from "next/navigation";
import { MotionDetailPage } from "@/components/motion/motion-pages";
import { getMotionEntry, MOTION_ENTRIES } from "@/lib/motion/catalog";
import { motionMetadata } from "@/lib/motion/seo";
export const dynamicParams = false;
export function generateStaticParams() {
  return MOTION_ENTRIES.map((entry) => ({ slug: entry.id }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const entry = getMotionEntry((await params).slug);
  if (!entry) notFound();
  return motionMetadata("zh", entry);
}
export default async function Page({ params }: Props) {
  const entry = getMotionEntry((await params).slug);
  if (!entry) notFound();
  return <MotionDetailPage entry={entry} locale="zh" />;
}
