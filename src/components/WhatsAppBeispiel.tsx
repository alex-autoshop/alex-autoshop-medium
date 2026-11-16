import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Paperclip, Smile } from "lucide-react";
import { TEILE_AGENT_CHATS, TEILE_AGENT_CHAT_HINWEIS, TEILE_AGENT_CODE_VORGABE } from "../../shared/teile-agent.js";
import { whatsappAnfrageUrl } from "../../shared/whatsapp-anfrage.js";

type Nachricht = (typeof TEILE_AGENT_CHATS)[number]["nachrichten"][number];

function Haken() {
  return (
    <svg viewBox="0 0 16 11" className="ml-1 inline-block h-[11px] w-4" aria-hidden="true">
      <path d="M11.1 0.3 4.7 6.7 2.4 4.4 1 5.8l3.7 3.7L12.5 1.7z" fill="#53bdeb" />
      <path d="M14.2 0.3 7.8 6.7l-.7-.7-1.3 1.4 2 2L15.6 1.7z" fill="#53bdeb" />
    </svg>
  );
}

function Meta({ zeit, aus }: { zeit: string; aus: boolean }) {
  return (
    <span className="wa-meta">
      {zeit}
      {aus ? <Haken /> : null}
    </span>
  );
}

function Blase({ nachricht }: { nachricht: Nachricht }) {
  const aus = nachricht.von === "kunde";
  const klasse = aus ? "wa-aus" : "wa-ein";
  if (nachricht.art === "bild" && nachricht.bild) {
    return (
      <div className={`${klasse} w-[78%] overflow-hidden p-[3px]`}>
        <div className="relative">
          <img src={nachricht.bild} alt={nachricht.alt || ""} className="block max-h-[32rem] w-full rounded-[6px] bg-[#efeae2] object-contain" />
          <span className="wa-meta-bild">
            {nachricht.zeit}
            {aus ? <Haken /> : null}
          </span>
        </div>
      </div>
    );
  }
  if (nachricht.art === "angebot" && nachricht.angebot) {
    const angebot = nachricht.angebot;
    const zeile = [angebot.marke, angebot.nummer].filter(Boolean).join(" ");
    return (
      <div className={`${klasse} w-[86%] overflow-hidden p-[3px] pb-1`}>
        {angebot.bild ? <img src={angebot.bild} alt={nachricht.alt || angebot.marke} className="block max-h-44 w-full rounded-[6px] bg-white object-contain" /> : null}
        <div className="px-1.5 pt-1 text-[15px] leading-snug text-[#111b21]">
          <div>{angebot.stufe}</div>
          <div>{zeile}</div>
          <div>
            {angebot.altPreis ? <s className="mr-1 text-[#667781]">{angebot.altPreis}</s> : null}
            {angebot.preis} inkl. MwSt
            {angebot.zeit ? ` · ${angebot.zeit}` : ""}
            <Meta zeit={nachricht.zeit} aus={false} />
          </div>
        </div>
      </div>
    );
  }
  if (nachricht.art === "liste" && nachricht.liste) {
    const liste = nachricht.liste;
    return (
      <div className={`${klasse} px-2 pb-1 pt-1.5 text-[15px] leading-snug text-[#111b21]`}>
        <div>{liste.titel}</div>
        {liste.zeilen.map((zeile, index) => (
          <div key={zeile.marke}>{index + 1} {zeile.marke} {zeile.preis}</div>
        ))}
        <Meta zeit={nachricht.zeit} aus={false} />
      </div>
    );
  }
  if (nachricht.art === "korb" && nachricht.korb) {
    const korb = nachricht.korb;
    return (
      <div className={`${klasse} px-2 pb-1 pt-1.5 text-[15px] leading-snug text-[#111b21]`}>
        <div>{korb.titel}</div>
        {korb.zeilen.map((zeile) => (
          <div key={zeile.name}>
            {zeile.name}
            <br />
            <s className="text-[#667781]">{zeile.alt}</s> {zeile.preis}
          </div>
        ))}
        <div>{korb.rabatt}</div>
        <div>Summe {korb.summe} inkl. MwSt</div>
        <a href={whatsappAnfrageUrl(TEILE_AGENT_CODE_VORGABE)} className="font-semibold text-[#027eb5] underline">
          {korb.linkText}
        </a>
        <Meta zeit={nachricht.zeit} aus={false} />
      </div>
    );
  }
  return (
    <div className={`${klasse} px-2 pb-1 pt-1.5 text-[15px] leading-snug text-[#111b21]`}>
      {nachricht.text}
      <Meta zeit={nachricht.zeit} aus={aus} />
    </div>
  );
}

export function WhatsAppBeispiel() {
  const [aktiv, setAktiv] = useState(0);
  const verlauf = useRef<HTMLDivElement>(null);
  const chat = TEILE_AGENT_CHATS[aktiv];

  useEffect(() => {
    const el = verlauf.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [aktiv]);

  return (
    <div>
      <div role="tablist" aria-label="Beispiel-Chats" className="mb-3 flex gap-2 overflow-x-auto">
        {TEILE_AGENT_CHATS.map((eintrag, index) => {
          const an = index === aktiv;
          return (
            <button
              key={eintrag.id}
              type="button"
              role="tab"
              id={`chat-tab-${eintrag.id}`}
              aria-selected={an}
              aria-controls={`chat-panel-${eintrag.id}`}
              onClick={() => setAktiv(index)}
              className={
                an
                  ? "min-h-12 shrink-0 rounded-full bg-[#111b21] px-4 text-sm font-semibold text-white"
                  : "min-h-12 shrink-0 rounded-full border border-border bg-card px-4 text-sm font-semibold"
              }
            >
              {eintrag.tab}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`chat-panel-${chat.id}`}
        aria-labelledby={`chat-tab-${chat.id}`}
        className="overflow-hidden rounded-2xl border border-[#d1d7db] bg-[#efeae2]"
      >
        <div className="flex items-center gap-3 border-b border-[#e9edef] bg-[#f0f2f5] px-3 py-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-sm font-bold text-white">A</span>
          <div className="min-w-0 leading-tight">
            <p className="text-[16px] font-semibold text-[#111b21]">Alex Autoshop</p>
            <p className="text-[13px] text-[#667781]">online</p>
          </div>
        </div>
        <div ref={verlauf} className="wa-wand flex h-[min(68vh,640px)] flex-col gap-1.5 overflow-y-auto px-3 py-3">
          {chat.nachrichten.map((nachricht) => (
            <Blase key={nachricht.key} nachricht={nachricht} />
          ))}
        </div>
        <div className="flex items-center gap-2 bg-[#f0f2f5] px-2 py-1.5 text-[#54656f]" aria-hidden="true">
          <Smile className="h-6 w-6 shrink-0" />
          <div className="flex min-h-10 flex-1 items-center rounded-full bg-white px-3 text-[15px] text-[#667781]">Nachricht</div>
          <Paperclip className="h-6 w-6 shrink-0" />
          <Camera className="h-6 w-6 shrink-0" />
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white">
            <Mic className="h-5 w-5" />
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{TEILE_AGENT_CHAT_HINWEIS}</p>
    </div>
  );
}
