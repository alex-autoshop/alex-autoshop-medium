import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";

export default function NotFound() {
  return (
    <div className="container py-24 text-center">
      <Seo title="Seite nicht gefunden" />
      <p className="font-display font-bold text-7xl text-primary mb-4">404</p>
      <h1 className="text-2xl mb-3">Diese Seite gibt es nicht.</h1>
      <p className="text-muted-foreground mb-8">Aber unser Sortiment schon — schau im Shop vorbei.</p>
      <Link to="/shop" className="btn-primary">Zum Shop</Link>
    </div>
  );
}
