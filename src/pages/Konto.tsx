import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Loader2, Mail, Lock, Building2, User as UserIcon, Phone, Car, Plus, Trash2, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/context/AuthContext";

type Modus = "login" | "register" | "vergessen" | "neu";

export default function Konto() {
  const { signIn, signUp, configured, resetPassword, updatePassword, recovery } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string })?.from || "/dashboard";

  const [mode, setMode] = useState<Modus>("login");
  /** Link zum Zurücksetzen ist raus — Hinweis statt Formular. */
  const [mailRaus, setMailRaus] = useState(false);
  const [password2, setPassword2] = useState("");

  // Über den Link aus der E-Mail gekommen? Dann direkt das neue Passwort setzen.
  useEffect(() => {
    if (recovery) setMode("neu");
  }, [recovery]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  // Projekt-Fahrzeuge: bei Registrierung einpflegen → im AI-Planner per Ein-Tipp wählbar
  const [vehicles, setVehicles] = useState<{ label: string; color_code: string; color_name: string; vin: string }[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "vergessen") {
        const { error } = await resetPassword(email);
        // Bei Unbekannten kommt dieselbe Antwort — sonst könnte man testen,
        // welche Adressen Kunde sind.
        if (error) return toast.error("Hat nicht geklappt", { description: error });
        setMailRaus(true);
        return;
      }
      if (mode === "neu") {
        if (password.length < 6) return toast.error("Mindestens 6 Zeichen.");
        if (password !== password2) return toast.error("Die beiden Passwörter sind nicht gleich.");
        const { error } = await updatePassword(password);
        if (error) return toast.error("Passwort nicht geändert", { description: error });
        toast.success("Neues Passwort gespeichert.");
        setPassword(""); setPassword2("");
        navigate("/dashboard");
        return;
      }
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
              ...(v.color_name.trim() ? { color_name: v.color_name.trim() } : {}),
              ...(v.vin.trim() ? { vin: v.vin.trim() } : {}),
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
      <Seo title={mode === "register" ? "Registrieren" : mode === "vergessen" ? "Passwort vergessen" : mode === "neu" ? "Neues Passwort" : "Login"} />

      <div className="card-tilt hover:translate-y-0 p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl mb-1">
          {mode === "login" ? "Anmelden"
            : mode === "register" ? "Konto erstellen"
            : mode === "vergessen" ? "Passwort vergessen"
            : "Neues Passwort"}
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          {mode === "login"
            ? "Melde dich an für Teilebörse & Mitgliederbereich."
            : mode === "register"
            ? "Kostenlos registrieren — auch ohne Mitgliedschaft. Du siehst sofort, wie viel du als Mitglied sparen würdest."
            : mode === "vergessen"
            ? "Trag deine E-Mail ein. Wir schicken dir einen Link, mit dem du ein neues Passwort setzt."
            : "Such dir ein neues Passwort aus. Danach bist du direkt angemeldet."}
        </p>

        {!configured && (
          <div className="mb-5 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            Login ist noch nicht aktiviert. Die Supabase-Zugangsdaten müssen in Vercel
            hinterlegt werden (siehe Hinweis vom Entwickler).
          </div>
        )}

        {/* Umschalter — beim Passwort-Zurücksetzen fehl am Platz */}
        {(mode === "login" || mode === "register") && (
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
        )}

        {/* Link ist raus — kein Formular mehr, nur der Hinweis */}
        {mode === "vergessen" && mailRaus ? (
          <div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Schau in dein Postfach.</p>
                <p className="text-muted-foreground mt-1">
                  Falls es zu <span className="font-medium text-foreground">{email}</span> ein Konto gibt, ist der Link unterwegs.
                  Er gilt eine Stunde. Nichts da? Dann schau bitte auch im Spam-Ordner.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setMailRaus(false); setMode("login"); }}
              className="btn-outline w-full mt-4 gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Zurück zur Anmeldung
            </button>
          </div>
        ) : (
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
                  <div key={i} className="rounded-lg border border-border p-2.5 mb-2 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={v.label}
                        onChange={(e) => setVehicles(vehicles.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                        placeholder="Fahrzeug, z.B. BMW 320i G20"
                        className="input-base flex-1 text-foreground"
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
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={v.color_code}
                        onChange={(e) => setVehicles(vehicles.map((x, j) => (j === i ? { ...x, color_code: e.target.value } : x)))}
                        placeholder="Farbcode"
                        className="input-base text-foreground"
                      />
                      <input
                        value={v.color_name}
                        onChange={(e) => setVehicles(vehicles.map((x, j) => (j === i ? { ...x, color_name: e.target.value } : x)))}
                        placeholder="Farbname"
                        className="input-base text-foreground"
                      />
                    </div>
                    <input
                      value={v.vin}
                      onChange={(e) => setVehicles(vehicles.map((x, j) => (j === i ? { ...x, vin: e.target.value } : x)))}
                      placeholder="VIN — wir ermitteln den Farbcode kostenlos"
                      className="input-base text-foreground"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setVehicles([...vehicles, { label: "", color_code: "", color_name: "", vin: "" }])}
                  className="btn-outline w-full text-sm"
                >
                  <Plus className="w-4 h-4" /> Fahrzeug hinzufügen
                </button>
              </div>
            </>
          )}
          {mode !== "neu" && (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail" className="input-base pl-11" autoComplete="email" />
            </div>
          )}

          {mode !== "vergessen" && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="password" required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "neu" ? "Neues Passwort (mind. 6 Zeichen)" : "Passwort (mind. 6 Zeichen)"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="input-base pl-11"
              />
            </div>
          )}

          {mode === "neu" && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="password" required minLength={6}
                value={password2} onChange={(e) => setPassword2(e.target.value)}
                placeholder="Neues Passwort wiederholen"
                autoComplete="new-password"
                className="input-base pl-11"
              />
            </div>
          )}

          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => { setMode("vergessen"); setPassword(""); }}
                className="text-sm text-muted-foreground hover:text-primary underline underline-offset-2"
              >
                Passwort vergessen?
              </button>
            </div>
          )}

          <button type="submit" disabled={loading || !configured} className="btn-primary w-full mt-2 gap-2">
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {mode === "login" ? "Anmelden"
              : mode === "register" ? "Konto erstellen"
              : mode === "vergessen" ? <><KeyRound className="w-4 h-4" /> Link schicken</>
              : "Passwort speichern"}
          </button>

          {mode === "vergessen" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="w-full text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1.5 pt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Anmeldung
            </button>
          )}
        </form>
        )}

        <p className="text-xs text-muted-foreground mt-5 text-center">
          Mit der Registrierung akzeptierst du unsere{" "}
          <Link to="/agb" className="text-primary underline">AGB</Link> und{" "}
          <Link to="/datenschutz" className="text-primary underline">Datenschutz</Link>.
        </p>
      </div>
    </div>
  );
}
