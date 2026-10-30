# Don du sang (Blutspende)

Die nächsten **Blutspendetermine des Établissement français du sang (EFS)** rund um dein Haus, in
Gladys: wie viele in den nächsten Tagen, wo und wann der nächste ist, ob du online reservieren
kannst, und Hinweise in deinen Szenen. Die Daten stammen aus der öffentlichen Karte des EFS, der von
[dondesang.efs.sante.fr](https://dondesang.efs.sante.fr/trouver-une-collecte): **ohne Konto, ohne
Schlüssel**.

Kontinentalfrankreich und die vom EFS versorgten Überseedepartements.

## Was du bekommst

- Ein Gerät, **die Zone**: rund um das in Gladys verortete Haus oder um einen Punkt, den du eingibst,
  im Umkreis von 5 bis 50 km.
- Seine Sensoren: die Anzahl der Spendetage in den **nächsten 7 Tagen** und in den **nächsten 30
  Tagen**, und der **nächste Termin**: Ort und Gemeinde, Tag und Uhrzeiten, Entfernung,
  Online-Reservierung und freie Plätze.
- Ein **Dashboard-Widget** „Blutspendetermine“: die nächsten Termine der Zone (höchstens 8), mit
  Tag, Uhrzeiten, Entfernung und Reservierungslink.
- **Szenen-Auslöser**: „Neuer Blutspendetermin angekündigt“, „Blutspende heute“ (jeden Morgen gegen
  8 Uhr) und „Blutspende morgen“ (jeden Abend gegen 18 Uhr).
- Eine **Szenen-Aktion** „Blutspende in der Nähe“: die Termine eines Zeitraums in einem Satz, zum
  Senden oder Sagen.
- Texte auf Englisch, Französisch, Deutsch und Spanisch.

Prüfe Termin und Spendekriterien immer auf der EFS-Website, bevor du hingehst: Uhrzeiten können sich
ändern, und nicht jeder kann an einem bestimmten Tag Blut spenden.

## Voraussetzungen

- Gladys Assistant **5.3.0** oder neuer.
- Internetzugang von Gladys aus (`oudonner.api.efs.sante.fr`).
- Das Haus in Gladys verortet (Einstellungen → Häuser) oder ein Punkt in der Konfiguration.

## Installation

Öffne in Gladys **Integrationen → Von GitHub installieren** und gib die Adresse dieses Repositorys
ein: `https://github.com/guim31/gladys-don-du-sang`. Gladys lädt das Image herunter und startet die
Integration.

## Konfiguration

### Einstellungen

- **Umkreis**: 5, 10, 20 (Standard), 30 oder 50 km um den Mittelpunkt der Zone, Luftlinie.
- **Breitengrad / Längengrad eines anderen Punkts**: lass beide leer, um das in Gladys verortete
  Haus zu nutzen. Gib beide ein (Dezimalgrad, Punkt oder Komma: `43.6045` und `1.4440`), um einem
  anderen Ort zu folgen: deinem Büro, dem Ort deiner Eltern.
- **Sprache der Namen und Meldungen**: die Sprache der Funktionsnamen, der Szenentexte und des
  Berichts „Prüfen“ (standardmäßig Französisch). Orte und Gemeinden bleiben, wie der EFS sie
  schreibt.

### Gerät hinzufügen

Speichere die Konfiguration, öffne dann den Reiter **Entdecken** der Integration und füge das Gerät
„Don du sang“ hinzu („Blutspende“ auf Deutsch). Seine Namen werden beim Hinzufügen festgelegt:
wähle vorher die Sprache.

### Prüfen

Die Schaltfläche **Prüfen** zeigt die verwendete Zone (Haus oder Punkt, Umkreis), das letzte Lesen
beim EFS und sein Ergebnis, und ob das Gerät hinzugefügt ist.

## Gerät

| Funktion                      | Typ             | Inhalt                                         |
| ----------------------------- | --------------- | ---------------------------------------------- |
| Blutspendetermine in 7 Tagen  | Zähler          | Spendetage von heute bis zum 6. Tag danach     |
| Blutspendetermine in 30 Tagen | Zähler          | Spendetage von heute bis zum 29. Tag danach    |
| Nächster Termin: Ort          | Text            | `SALLE DES FÊTES, MURET`                       |
| Nächster Termin: Datum        | Text            | `morgen, 10:00–13:30, 14:30–19:00`             |
| Nächster Termin: Entfernung   | Entfernung (km) | vom Mittelpunkt der Zone, Luftlinie            |
| Nächster Termin: Reservierung | Text            | `Online-Reservierung · 19 von 44 Plätzen frei` |

Ein Termin über zwei Tage zählt als zwei Spendetage. Ein Termin verlässt „nächster“, wenn sein
letzter Zeitraum endet.

## Dashboard-Widget

Füge das Widget **Blutspendetermine** einem Dashboard hinzu. Einstellungen: der Zeitraum (heute,
morgen, nächste 7 Tage, nächste 30 Tage), die Überschrift mit der Anzahl und das Abzeichen „Online
buchen“. Jede Zeile zeigt Ort, Tag und Uhrzeiten, Entfernung; ein Tippen öffnet Adresse, freie
Plätze und den Reservierungslink auf der EFS-Website.

## Szenen-Auslöser

- **Neuer Blutspendetermin angekündigt**: der EFS veröffentlicht einen neuen Spendetag in der Zone
  (zweimal täglich gelesen). Das erste Lesen einer Zone ist die Referenz: bei der Installation wird
  nichts angekündigt, auch nicht, wenn du die Zone änderst.
- **Blutspende heute**: jeden Morgen gegen 8 Uhr, für jeden Termin der Zone an diesem Tag.
- **Blutspende morgen**: jeden Abend gegen 18 Uhr, für jeden Termin der Zone am nächsten Tag.

Variablen: Ort, Gemeinde, Adresse, Datum und Uhrzeiten, Tag (`JJJJ-MM-TT`), Uhrzeiten, Entfernung
(km), Reservierung, Reservierungslink, Ende (ISO 8601).

## Szenen-Aktion

**Blutspende in der Nähe**: wähle einen Zeitraum und die Anzahl genannter Termine; die Aktion gibt
einen Satz zurück („Nächste 7 Tage: 6 Blutspendetermine in deiner Nähe, …“), die Anzahl der
Spendetage (um nur fortzufahren, wenn es einen gibt), Ort, Datum und Reservierungslink des nächsten
Termins.

## Szenen-Beispiele

- „Blutspende morgen“ → eine Nachricht senden: `Blutspende morgen in {{place}}, {{city}}:
{{hours}}. Iss gut und trink viel Wasser! {{url}}`.
- Jeden Montag um 8 Uhr → „Blutspende in der Nähe“ (nächste 7 Tage) → nur fortfahren, wenn die
  Anzahl größer als 0 ist → den Satz auf dem Lautsprecher sagen.
- „Neuer Blutspendetermin angekündigt“ → eine Benachrichtigung mit Ort und Datum.

## Daten und Aktualisierung

- Quelle: die Karten-API des EFS (`oudonner.api.efs.sante.fr/carto-api`, v3), auf data.gouv.fr
  veröffentlicht („Lieux et horaires des collectes de sang“) unter der Licence Ouverte 2.0.
- Eine Anfrage **alle 12 Stunden** (höchstens zweimal täglich), für die Termine ab heute. Ein
  fehlgeschlagenes Lesen wird nach einer Stunde wiederholt; die bekannten Termine bleiben sichtbar.
- Rund um Paris braucht der EFS bis zu einer Minute für die Antwort: das erste Lesen nach einem Start
  kann so lange dauern.
- Alle 10 Minuten folgen Zähler und nächster Termin ohne Netzwerk der Uhr.
- Die Anfrage enthält den Mittelpunkt der Zone **auf etwa einen Kilometer gerundet**: die genaue
  Position deines Hauses wird nicht gesendet. Die Entfernungen berechnet die Integration.
- Termine, die dem Personal eines Unternehmens, einer Schule oder einer Militäreinheit vorbehalten
  sind, werden ausgelassen.
- Bereits Angekündigtes wird in `/data/state.json` gespeichert: ein Neustart kündigt nichts doppelt
  an.

## Fehlerbehebung

- **Kein Gerät im Reiter Entdecken**: das Haus ist in Gladys nicht verortet und kein Punkt
  eingegeben. Die Schaltfläche „Prüfen“ sagt es.
- **Zähler auf 0**: kein öffentlicher Termin im Umkreis; versuche einen größeren Umkreis. Der EFS
  veröffentlicht etwa zehn Wochen im Voraus.
- **„Letztes Lesen fehlgeschlagen“**: die EFS-Website ist nicht erreichbar; die Integration
  versucht es stündlich erneut.
- **Ein Termin fehlt oder weicht ab**: maßgeblich ist der EFS; prüfe auf seiner Website.
- Protokolle: setze `LOG_LEVEL=debug` für die Details jedes Lesens.

## Einschränkungen

- Nur die mobilen Termine (Gemeindesäle, öffentlich zugängliche Unternehmen, Universitäten); die
  festen Spendezentren („Maisons du don“) haben eigene Öffnungszeiten und werden nicht aufgeführt.
- Die Reservierungsangaben sind die der EFS-Karte: angebotene Online-Reservierung, freie Plätze
  für die Blutspende. Plasma- und Thrombozytenspenden erfolgen nach Termin in den Spendezentren.
- Entfernungen in Luftlinie.
- Nicht mit dem Établissement français du sang verbunden.

## Danksagung

- Daten: [Établissement français du sang](https://efs.sante.fr), Licence Ouverte 2.0
  ([data.gouv.fr](https://www.data.gouv.fr/datasets/lieux-et-horaires-des-collectes-de-sang)).
- Gebaut mit dem [Integrations-SDK von Gladys Assistant](https://github.com/GladysAssistant/integration-sdk-js).
