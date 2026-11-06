import { Link, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { ProductGrid } from "@/components/ProductGrid";
import { useVollerKatalog } from "@/hooks/useVollerKatalog";
import { brandOf, markeAusSlug } from "@/lib/marken";

export default function Marke() {
  const { slug = "" } = useParams();
  const name = markeAusSlug(slug);
  const { products, isLoading } = useVollerKatalog("");
  const liste = name ? products.filter((p) => brandOf(p) === name) : [];

  if (!name) {
    return (
      <div className="container py-16">
        <Seo title="Marke nicht gefunden" noindex />
        <h1 className="text-2xl mb-3">Diese Marke gibt es hier nicht.</h1>
        <Link to="/shop" className="text-primary font-semibold underline">Zum Shop</Link>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Seo
        title={`${name} kaufen`}
        description={`${name} bei Alex Autoshop in Wuppertal. Lackierbedarf und Werkstattprodukte.`}
      />
      <h1 className="text-3xl sm:text-4xl mb-6">{name}</h1>
      {isLoading && liste.length === 0 ? (
        <p className="text-sm text-muted-foreground">Produkte werden geladen …</p>
      ) : (
        <ProductGrid products={liste} isLoading={isLoading} columns={5} />
      )}
    </div>
  );
}
