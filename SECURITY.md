# Security Policy

## Unterstützte Versionen

| Version | Unterstützt          |
| ------- | -------------------- |
| 2.0.x   | :white_check_mark:   |
| 1.0.x   | :x:                  |

## Sicherheitsupdates

Sicherheitsupdates werden für die aktuelle Hauptversion bereitgestellt.

## Melden von Sicherheitslücken

**Bitte melde Sicherheitslücken NICHT über öffentliche GitHub Issues!**

Stattdessen:
1. Sende eine E-Mail an: security@enterprise-dashboard.local
2. Beschreibe die Schwachstelle so detailliert wie möglich
3. Warte auf eine Bestätigung (normalerweise innerhalb von 48 Stunden)
4. Gib uns Zeit die Schwachstelle zu beheben (90 Tage Disclosure Policy)

## Bekannte Sicherheitsmaßnahmen

- Helmet.js für Security Headers
- CORS Konfiguration
- Input Validation auf API-Endpunkten
- Keine sensiblen Daten im Frontend

## Sicherheits-Checkliste für Entwickler

- [ ] Keine Hardcoded Secrets
- [ ] Alle Dependencies aktuell?
- [ ] Input validiert?
- [ ] Keine SQL Injection möglich?
- [ ] XSS Schutz aktiviert?

