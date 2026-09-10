import { HomePageEnhanced, type HomePageEnhancedProps } from './home-page-enhanced'
import { HomeCreators } from './home-creators'
import { HomeShowcaseStatic } from './home-showcase-static'

// Render editorial content on the server: client navigation receives HTML,
// not the entire gallery/creator catalog and its data-building functions.
export function HomePage(props: Omit<HomePageEnhancedProps, 'showcase' | 'creators'>) {
  const locale = props.initialLocale || 'en'
  return <HomePageEnhanced {...props} showcase={<HomeShowcaseStatic locale={locale} />} creators={<HomeCreators locale={locale} />} />
}
