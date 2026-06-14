import { useEffect, useState, useCallback } from "react";
import { Mail, MailOpen, BadgeCheck, Tag, Car, Bell, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  getMessages,
  markRead,
  markAllRead,
  getPendingRequests,
  acceptRequest,
  ADMIN_EMAILS,
  type Message,
  type MembershipRequest,
} from "@/lib/inbox";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<Message["type"], typeof Mail> = {
  system: Bell,
  membership: BadgeCheck,
  offer: Tag,
  dealer: Car,
};

export function Inbox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [msgs, reqs] = await Promise.all([
      getMessages(user.id),
      isAdmin ? getPendingRequests() : Promise.resolve([]),
    ]);
    setMessages(msgs);
    setRequests(reqs);
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (m: Message) => {
    if (!m.read) {
      await markRead(m.id);
      setMessages((p) => p.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
    }
  };

  const accept = async (r: MembershipRequest) => {
    const { error } = await acceptRequest(r);
    if (error) return toast.error("Fehler", { description: error });
    toast.success(`Level ${r.level} freigeschaltet`, {
      description: "Das Mitglied sieht den Rabatt ab dem nächsten Login.",
    });
    setRequests((p) => p.filter((x) => x.id !== r.id));
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="max-w-2xl">
      {/* Admin: offene Mitgliedschaftsanfragen */}
      {isAdmin && requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg mb-3">Offene Mitgliedschaftsanfragen</h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="card-tilt hover:translate-y-0 p-4 flex items-center gap-3">
                <BadgeCheck className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Level {r.level} — {r.email}</p>
                  <p className="text-xs text-muted-foreground">Module: {r.modules?.join(", ") || "alle"}</p>
                </div>
                <button onClick={() => accept(r)} className="btn-primary text-sm px-4 min-h-[40px]">
                  <Check className="w-4 h-4" /> Annehmen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl">Nachrichten</h2>
        {messages.some((m) => !m.read) && (
          <button
            onClick={async () => { await markAllRead(user!.id); setMessages((p) => p.map((x) => ({ ...x, read: true }))); }}
            className="text-sm text-primary font-semibold hover:underline"
          >
            Alle gelesen
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="card-tilt hover:translate-y-0 p-8 text-center">
          <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Noch keine Nachrichten. Hier landen Mitgliedschafts-Updates, Angebote und
            Nachrichten aus dem Fahrzeugmarkt.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((m) => {
            const Icon = TYPE_ICON[m.type] ?? Bell;
            return (
              <button
                key={m.id}
                onClick={() => open(m)}
                className={cn(
                  "w-full text-left card-tilt hover:translate-y-0 p-4 flex gap-3",
                  !m.read && "border-primary/40 bg-primary/5"
                )}
              >
                <span className={cn("mt-0.5 shrink-0", m.read ? "text-muted-foreground" : "text-primary")}>
                  {m.read ? <MailOpen className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm truncate", !m.read && "font-bold")}>{m.title}</p>
                    {!m.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  {m.body && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-3">{m.body}</p>}
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {m.sender_name ? `${m.sender_name} · ` : ""}
                    {new Date(m.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
