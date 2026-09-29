// Free hand-offs: WhatsApp click-to-chat, Blinkit search, Zomato dish search.
// Blinkit and Zomato have no public consumer APIs, so these are web links that
// open the apps when installed. The app also copies the text to the clipboard.

export function digitsOnly(phone?: string): string {
  const d = (phone ?? '').replace(/\D/g, '');
  if (d.length === 10) return '91' + d; // assume India
  return d;
}

export function whatsappLink(text: string, phone?: string): string {
  const p = digitsOnly(phone);
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function blinkitSearch(query: string): string {
  return `https://blinkit.com/s/?q=${encodeURIComponent(query)}`;
}

const CITY_SLUG: Record<string, string> = {
  bengaluru: 'bangalore',
  bangalore: 'bangalore',
  mumbai: 'mumbai',
  delhi: 'ncr',
  gurugram: 'ncr',
  noida: 'ncr',
  hyderabad: 'hyderabad',
  chennai: 'chennai',
  pune: 'pune',
  kolkata: 'kolkata',
  ahmedabad: 'ahmedabad',
};

export function zomatoSearch(dishName: string, city: string): string {
  const c = CITY_SLUG[city.trim().toLowerCase()] ?? 'bangalore';
  const slug = dishName
    .toLowerCase()
    .replace(/\bwith\b.*$/, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `https://www.zomato.com/${c}/delivery/dish-${slug}`;
}

export const CITIES: { name: string; lat: number; lon: number }[] = [
  { name: 'Bengaluru', lat: 12.97, lon: 77.59 },
  { name: 'Mumbai', lat: 19.08, lon: 72.88 },
  { name: 'Delhi', lat: 28.61, lon: 77.21 },
  { name: 'Gurugram', lat: 28.46, lon: 77.03 },
  { name: 'Hyderabad', lat: 17.39, lon: 78.49 },
  { name: 'Chennai', lat: 13.08, lon: 80.27 },
  { name: 'Pune', lat: 18.52, lon: 73.86 },
  { name: 'Kolkata', lat: 22.57, lon: 88.36 },
  { name: 'Ahmedabad', lat: 23.02, lon: 72.57 },
];
