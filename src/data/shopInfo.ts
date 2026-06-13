export const SHOP_INFO = {
  name: "Alex Autoshop",
  owner: "Alexander Haritopoulos",
  street: "Handelstraße 64",
  zip: "42277",
  city: "Wuppertal",
  phone: "0202 82690",
  phoneIntl: "+4920282690",
  whatsapp: "+4920282690",
  email: "info@alex-autoshop.de",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Alex+Autoshop+Handelstra%C3%9Fe+64+42277+Wuppertal",
  mapsEmbedUrl:
    "https://www.google.com/maps?q=Handelstra%C3%9Fe%2064,%2042277%20Wuppertal&output=embed",
  hours: [
    { days: "Montag – Freitag", time: "9:00 – 17:30 Uhr" },
    { days: "Samstag", time: "9:00 – 14:00 Uhr" },
    { days: "Sonntag", time: "geschlossen" },
  ],
} as const;

export function whatsappLink(message: string) {
  return `https://wa.me/${SHOP_INFO.whatsapp.replace("+", "")}?text=${encodeURIComponent(message)}`;
}
