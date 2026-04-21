import { Header } from '@/components/dashboard/header';
import { ScraperForm } from '@/components/scraper/scraper-form';
import { ScraperResults } from '@/components/scraper/scraper-results';

export default function ScraperPage() {
  return (
    <div>
      <Header
        title="Lead Scraper"
        description="Scrape Google Maps for business leads using Apify"
      />
      <div className="p-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <ScraperForm />
        </div>
        <div>
          <ScraperResults />
        </div>
      </div>
    </div>
  );
}
