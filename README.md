# Rezervace posilovny

Webová aplikace pro rezervaci posilovny. Invite-only systém s týdenním kalendářem, real-time aktualizacemi a admin panelem.

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS
- Supabase (auth, PostgreSQL, realtime, Edge Functions)
- GitHub Pages (deploy)

## Nastavení Supabase

1. Vytvořte nový projekt na [supabase.com](https://supabase.com)
2. V SQL Editoru spusťte migraci ze souboru `supabase/migrations/001_initial_schema.sql`
3. V nastavení projektu povolte **Realtime** pro tabulku `reservations`
4. Nastavte **Site URL** v Authentication > URL Configuration na URL vaší aplikace
5. Pro email notifikace:
   - Vytvořte účet na [resend.com](https://resend.com)
   - Deployněte Edge Function `notify-cancellation`
   - Nastavte secret `RESEND_API_KEY` v Supabase Edge Functions

### Vytvoření prvního admin uživatele

Po registraci prvního uživatele ho ručně nastavte jako admina:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'vas@email.cz';
```

## Lokální vývoj

```bash
# Naklonovat repo
git clone https://github.com/obzi/gym-reservation-system.git
cd gym-reservation-system

# Nainstalovat závislosti
npm install

# Vytvořit .env soubor
cp .env.example .env
# Vyplnit VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY

# Spustit dev server
npm run dev
```

## Deploy na GitHub Pages

1. V repozitáři nastavte GitHub Secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Push do `main` branche automaticky spustí deploy přes GitHub Actions
3. V Settings > Pages nastavte Source na `gh-pages` branch

## Funkce

- **Týdenní kalendář** s 15min sloty (07:00–22:00)
- **Mobilní zobrazení** s přepínáním dnů
- **Max 3 osoby** na jeden slot (server-side validace)
- **Rezervace max 3 dny dopředu** (včetně dnes)
- **Invite-only registrace** přes admin-generované odkazy
- **Admin panel**: správa uživatelů, rezervací a pozvánek
- **Email notifikace** při zrušení rezervace adminem
- **Realtime aktualizace** přes Supabase Realtime

## Proměnné prostředí

| Proměnná | Popis |
|---|---|
| `VITE_SUPABASE_URL` | URL vašeho Supabase projektu |
| `VITE_SUPABASE_ANON_KEY` | Anon key Supabase projektu |
| `RESEND_API_KEY` | API klíč Resend.com (v Supabase Edge Functions secrets) |
