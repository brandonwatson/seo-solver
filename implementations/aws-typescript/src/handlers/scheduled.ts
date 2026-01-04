import type { ScheduledEvent } from 'aws-lambda';
import { listSites, updateSiteLastCheck } from '../db/dynamodb';
import type { Site, CheckSchedule } from '../types';

export async function handler(event: ScheduledEvent): Promise<void> {
  console.log('Scheduled validation triggered:', JSON.stringify(event));

  try {
    // Get all sites
    const sites = await listSites();
    const now = new Date();

    // Filter sites that are due for validation
    const sitesToValidate = sites.filter(site => {
      if (site.check_schedule === 'manual') {
        return false;
      }

      if (!site.next_check) {
        return true;
      }

      const nextCheck = new Date(site.next_check);
      return now >= nextCheck;
    });

    console.log(`Found ${sitesToValidate.length} sites due for validation`);

    for (const site of sitesToValidate) {
      try {
        await validateSite(site);
      } catch (error) {
        console.error(`Error validating site ${site.site_id}:`, error);
      }
    }

    console.log('Scheduled validation completed');
  } catch (error) {
    console.error('Error in scheduled handler:', error);
    throw error;
  }
}

async function validateSite(site: Site): Promise<void> {
  console.log(`Validating site: ${site.site_id}`);

  // Import validate handler dynamically to avoid circular dependency
  // In production, you might want to invoke the Lambda function instead
  const { validateStructuredData } = await import('../validators/structured-data');
  const { validateIndexing } = await import('../validators/indexing');
  const { validateMobile } = await import('../validators/mobile');

  const allIssues = [];

  // Run validators on the main URL
  const url = site.site_url;

  const [structuredData, indexing, mobile] = await Promise.all([
    validateStructuredData(url),
    validateIndexing(url),
    validateMobile(url),
  ]);

  allIssues.push(...structuredData.issues);
  allIssues.push(...indexing.issues);
  allIssues.push(...mobile.issues);

  // Calculate next check time
  const now = new Date();
  let nextCheck: Date;

  switch (site.check_schedule) {
    case 'weekly':
      nextCheck = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'daily':
    default:
      nextCheck = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  // Update site with last check time and open issues count
  const openIssues = allIssues.filter(i => !i.status || i.status === 'open').length;

  await updateSiteLastCheck(
    site.site_id,
    now.toISOString(),
    nextCheck.toISOString(),
    openIssues
  );

  console.log(`Site ${site.site_id} validated: ${allIssues.length} issues found`);
}
