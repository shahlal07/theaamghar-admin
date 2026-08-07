// Zero-setup "open in Google Maps" link -- just a search query URL, no API
// key/billing required (unlike Places Autocomplete or an embedded map).
export function googleMapsUrl(address: string, city: string, province?: string | null): string {
  const query = [address, city, province].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
