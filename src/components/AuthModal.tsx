import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Mail, Lock, Building2, User as UserIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  /** Wird nach erfolgreichem Login aufgerufen */
  onSuccess?: () => void;
  defaultMode?: "login" | "register";
}

export function AuthModal({ open, onClose, onSuccess, defaultMode = "login" }: AuthModalProps) {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");

  const reset = () => {
    setEmail(""); setPassword(""); setCompany(""); setContact("");
    setMode(defaultMode);
  };

  const handleClose = () => { reset(); onClose(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) { toast.error("Login fehlgeschlagen", { description: error }); return; }
        toast.success("Willkommen zurück! 👋");
        handleClose();
        onSuccess?.();
      } else {
        const { error, needsConfirmation } = await signUp(email, password, {
          company_name: company,
          contact_name: contact,
        });
        if (error) { toast.error("Registrierung fehlgeschlagen", { description: error }); return; }
        if (needsConfirmation) {
          toast.success("Fast geschafft!", {
            description: "Bestätige den Link in deiner E-Mail, dann kannst du dich anmelden.",
          });
          setMode("login");
        } else {
          toast.success("Konto erstellt! ✓");
          handleClose();
          onSuccess?.();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm"
              initial={{ scale: 0.93, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
                <h2 className="text-lg font-display font-bold">
                  {mode === "login" ? "Anmelden" : "Konto erstellen"}
                </h2>
                <button
                  onClick={handleClose}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground"
                  aria-label="Schließen"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Toggle */}
                <div className="flex gap-1.5 p-1 bg-secondary rounded-xl">
                  {(["login", "register"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex-1 min-h-[40px] rounded-lg text-sm font-semibold transition-colors ${
                        mode === m ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "login" ? "Anmelden" : "Registrieren"}
                    </button>
                  ))}
                </div>

                {!configured && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    Login ist noch nicht konfiguriert.
                  </p>
                )}

                <form onSubmit={submit} className="space-y-3">
                  {mode === "register" && (
                    <>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Firma / Werkstatt (optional)"
                          className="input-base pl-10 text-sm"
                        />
                      </div>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          placeholder="Dein Name"
                          className="input-base pl-10 text-sm"
                        />
                      </div>
                    </>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-Mail"
                      className="input-base pl-10 text-sm"
                      autoComplete="email"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Passwort (mind. 6 Zeichen)"
                      className="input-base pl-10 text-sm"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !configured}
                    className="btn-primary w-full"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {mode === "login" ? "Jetzt anmelden" : "Konto erstellen"}
                  </button>
                </form>

                <p className="text-xs text-muted-foreground text-center">
                  Mit der Registrierung akzeptierst du unsere{" "}
                  <a href="/agb" target="_blank" rel="noopener noreferrer" className="text-primary underline">AGB</a>
                  {" "}und{" "}
                  <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary underline">Datenschutz</a>.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
