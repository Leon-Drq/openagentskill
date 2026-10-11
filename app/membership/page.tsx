import { MembershipPage } from '@/components/studio/studio-pages'
import { studioMetadata } from '@/lib/studio/seo'
export const metadata = studioMetadata('en', 'membership')
export default function Page() { return <MembershipPage locale="en" /> }
