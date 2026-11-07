export function gpsrLesen(felder?: Array<{ key?: string; value?: string } | null> | null): {
  name: string;
  adresse: string;
  kontakt: string;
  eu: string;
  hinweise: string;
  hat: boolean;
};
