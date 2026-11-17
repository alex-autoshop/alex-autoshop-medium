# alex-autoshop-test-webhooks

Das Vercel-Projekt **alex-autoshop-test-webhooks** hat als Root Directory `hosts/test-webhooks`. Fehlt der Ordner, bricht jeder Push mit `NOW_SANDBOX_WORKER_ROOTDIR_NOT_EXIST` ab — noch bevor ein Build-Befehl läuft.

`vercel.json` setzt `ignoreCommand` auf `node ignore-build.js`. Das Skript beendet sich mit Exit-Code 0. Vercel markiert den Build dann als übersprungen und legt kein Deployment an. Exit-Code 1 würde den Build fortsetzen.

Die Datei liegt nur in diesem Ordner. Das Hauptprojekt **alex-autoshop-medium** liest das `vercel.json` im Repository-Root und baut weiter wie bisher.

Der Ordner enthält absichtlich keine Zahlungsfunktion. Test-Webhooks laufen nicht neben der Live-Seite.
