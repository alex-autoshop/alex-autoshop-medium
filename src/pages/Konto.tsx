import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Loader2, Mail, Lock, Building2, User as UserIcon, Phone } from "lucide-react";
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
