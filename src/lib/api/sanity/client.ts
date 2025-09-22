import { createClient } from "@sanity/client";
import { env } from '$env/dynamic/public';

export function getClient() {
  const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET, PUBLIC_SANITY_API_VERSION } = env;
  
  if (!PUBLIC_SANITY_PROJECT_ID) {
    throw new Error('PUBLIC_SANITY_PROJECT_ID is required');
  }
  
  return createClient({
    projectId: PUBLIC_SANITY_PROJECT_ID,
    dataset: PUBLIC_SANITY_DATASET || 'production',
    apiVersion: PUBLIC_SANITY_API_VERSION || '2021-08-31',
    useCdn: true
  });
}
