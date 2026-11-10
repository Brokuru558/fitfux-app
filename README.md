# FitFux – Android-App

Eigenständige Version von FitFux (Kalorien, Training, Fux) mit
- **Health Connect**: Schritte, Aktivitäten (Lauf, Fußball …) und Gewicht automatisch von Garmin
- **Barcode-Scanner** + **Open Food Facts** für Markenprodukte
- **Schweizer Nährwertdatenbank** (BLV) offline

## Aktualisieren
1. Neue `app/index.html` (FitFux-Webapp) einchecken
2. Push auf `main` → GitHub Actions baut die APK
3. APK unter *Releases* herunterladen und installieren (Update über die alte Version)

Der Signierschlüssel liegt nicht im Repo, sondern in den Repo-Secrets `FITFUX_KEYSTORE_B64` (Keystore als Base64) und `FITFUX_KS_PASS` (Passwort). Gleicher Schlüssel = Updates lassen sich über die alte Version installieren.

Quellen: Schweizer Nährwertdatenbank V6.1 (BLV, naehrwertdaten.ch) · Open Food Facts (ODbL) · Free Exercise DB (Public Domain)
