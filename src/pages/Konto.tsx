import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Loader2, Mail, Lock, Building2, User as UserIcon, Phone, Car, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/context/AuthContext";

export default function Konto() {
  const { signIn, signUp, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string })?.from || "/dashboard";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  // Projekt-Fahrzeuge: bei Registrierung einpflegen → im AI-Planner per Ein-Tipp wählbar
  const [vehicles, setVehicles] = useState<{ label: string; color_code: string }[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) return toast.error("Login fehlgeschlagen", { description: error });
        toast.success("Willkommen zurück!");
        navigate(redirectTo);
      } else {
        const { error, needsConfirmation } = await signUp(email, password, {
          company_name: company,
          contact_name: contact,
          phone,
          vehicles: vehicles
            .filter((v) => v.label.trim())
            .map((v, i) => ({
              id: `${Date.now()}-${i}`,
              label: v.label.trim(),
              ...(v.color_code.trim() ? { color_code: v.color_code.trim() } : {}),
            })),
        });
        if (error) return toast.error("Registrierung fehlgeschlagen", { description: error });
        if (needsConfirmation) {
          toast.success("Konto erstellt!", {
            description: "Bitte bestätige den Link in deiner E-Mail, dann kannst du dich anmelden.",
          });
        } else {
          toast.success("Konto erstellt!", { description: "Du kannst dich jetzt anmelden." });
        }
        setMode("login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10 sm:py-16 max-w-md">
      <Seo title={mode === "login" ? "Login" : "Registrieren"} />

      <div className="card-tilt hover:translate-y-0 p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl mb-1">
          {mode === "login" ? "Anmelden" : "Konto erstellen"}
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          {mode === "login"
            ? "Melde dich an für Teileportal & Mitgliederbereich."
            : "Kostenlos registrieren — auch ohne Mitgliedschaft. Du siehst sofort, wie viel du als Mitglied sparen würdest."}
        </p>

        {!configured && (
          <div className="mb-5 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            Login ist noch nicht aktiviert. Die Supabase-Zugangsdaten müssen in Vercel
            hinterlegt werden (siehe Hinweis vom Entwickler).
          </div>
        )}

        {/* Umschalter */}
        <div className="flex gap-2 mb-6 p-1 bg-secondary rounded-lg">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 min-h-[44px] rounded-md font-semibold text-sm transition-colors ${
                mode === m ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "login" ? "Anmelden" : "Registrieren"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Firma / Werkstatt (optional)" className="input-base pl-11" />
              </div>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Dein Name" className="input-base pl-11" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon (optional)" className="input-base pl-11" />
              </div>

              {/* ── Projekt-Fahrzeuge (optional) ── */}
              <div className="pt-2">
                <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-primary" /> Deine Projekt-Fahrzeuge (optional)
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Einmal einpflegen — im AI-Materialplaner wählst du sie später mit einem Tipp aus.
                </p>
                {vehicles.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      value={v.label}
                      onChange={(e) => setVehicles(vehicles.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      placeholder="z.B. BMW 320i G20, 2021"
                      className="input-base flex-1"
                    />
                    <input
                      value={v.color_code}
                      onChange={(e) => setVehicles(vehicles.map((x, j) => (j === i ? { ...x, color_code: e.target.value } : x)))}
                      placeholder="Farbcode"
                      className="input-base w-28"
                    />
                    <button
                      type="button"
                      onClick={() => setVehicles(vehicles.filter((_, j) => j !== i))}
                      className="w-11 shrink-0 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-lg"
                      aria-label="Fahrzeug entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setVehicles([...vehicles, { label: "", color_code: "" }])}
                  className="btn-outline w-full text-sm"
                >
                  <Plus className="w-4 h-4" /> Fahrzeug hinzufügen
                </button>
              </div>
            </>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail" className="input-base pl-11" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort (mind. 6 Zeichen)" className="input-base pl-11" />
          </div>

          <button type="submit" disabled={loading || !configured} className="btn-primary w-full mt-2">
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {mode === "login" ? "Anmelden" : "Konto erstellen"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground mt-5 text-center">
          Mit der Registrierung akzeptierst du unsere{" "}
          <Link to="/agb" className="text-primary underline">AGB</Link> und{" "}
          <Link to="/datenschutz" className="text-primary underline">Datenschutz</Link>.
        </p>
      </div>
    </div>
  );
}
