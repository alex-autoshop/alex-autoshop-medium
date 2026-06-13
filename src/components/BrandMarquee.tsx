import { BRANDS } from "@/data/brands";

export function BrandMarquee() {
  const doubled = [...BRANDS, ...BRANDS];
  return (
    <div className="overflow-hidden py-8 border-y border-border bg-card">
      <div className="flex items-center gap-12 w-max animate-marquee">
        {doubled.map((brand, i) => (
          <img
            key={`${brand.name}-${i}`}
            src={brand.logo}
            alt={brand.name}
            title={brand.name}
            loading="lazy"
            className="h-9 sm:h-12 w-auto object-contain shrink-0"
          />
        ))}
      </div>
    </div>
  );
}
