export function grundpreisText(variante?: {
  unitPrice?: { amount?: string; currencyCode?: string } | null;
  unitPriceMeasurement?: { referenceValue?: number; referenceUnit?: string } | null;
} | null): string;
