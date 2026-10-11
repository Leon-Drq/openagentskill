import { MotionCollectionPage } from "@/components/motion/motion-pages";
import { motionMetadata } from "@/lib/motion/seo";
export const metadata = motionMetadata("zh");
export default function Page() {
  return <MotionCollectionPage locale="zh" />;
}
