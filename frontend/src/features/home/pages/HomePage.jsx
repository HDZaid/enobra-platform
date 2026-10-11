import { HomeHero } from '../components/HomeHero.jsx';
import { HomeStory } from '../components/HomeStory.jsx';
import { BusinessAreas } from '../components/BusinessAreas.jsx';
import { PortfolioPreview } from '../components/PortfolioPreview.jsx';
import { NewsPreview } from '../components/NewsPreview.jsx';
import { HomeImpact } from '../components/HomeImpact.jsx';
import { MotionPage } from '../../../components/ui/MotionPage.jsx';
export function HomePage() {
  return (
    <MotionPage title="Inicio">
      <HomeHero />
      <HomeStory />
      <BusinessAreas />
      <PortfolioPreview />
      <NewsPreview />
      <HomeImpact />
    </MotionPage>
  );
}
