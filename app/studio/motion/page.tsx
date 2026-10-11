import { MotionCollectionPage } from "@/components/motion/motion-pages";
import { motionMetadata } from "@/lib/motion/seo";
export const metadata = motionMetadata("en");
export default function Page() {
  return <MotionCollectionPage locale="en" />;
}
