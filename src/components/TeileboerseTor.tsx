import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useTeileboerseSichtbar } from "@/lib/teileboerseSichtbar";

/** Hält die Börse aus dem Baum, solange der Schalter zu und niemand das Admin-Konto ist. */
export function TeileboerseTor({ children }: { children: ReactNode }) {
  const { sichtbar, loading } = useTeileboerseSichtbar();
  if (loading) return <div className="min-h-[50vh]" />;
  if (sichtbar) return <>{children}</>;
  return <Navigate to="/" replace />;
}
