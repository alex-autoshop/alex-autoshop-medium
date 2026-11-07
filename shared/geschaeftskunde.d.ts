export function istGeschaeftskunde(bestellung?: {
  customer?: { tags?: string | string[]; default_address?: { company?: string } | null } | null;
  billing_address?: { company?: string } | null;
  shipping_address?: { company?: string } | null;
  note_attributes?: Array<{ name?: string; value?: string }>;
} | null): boolean;
