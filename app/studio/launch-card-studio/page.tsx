import { StudioSkillPage } from '@/components/studio/studio-pages'
import { studioMetadata } from '@/lib/studio/seo'
export const metadata = studioMetadata('en', 'skill')
export default function Page() { return <StudioSkillPage locale="en" /> }
