import { getClient } from "$lib/api/sanity/client";
import type { Services, PageData } from "$types/sanity";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (): Promise<PageData> => {
  try {
    const query = `*[_type == "services"] | order(publishedAt desc) {
      _id,
      _type,
      name,
      id,
      duration,
      price,
      opis
    }`;
    
    const services: Services[] = await getClient().fetch(query);
    
    return {
      services
    };
  } catch (error) {
    console.error('Error fetching services from Sanity:', error);
    return {
      services: []
    };
  }
};
