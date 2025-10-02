
# SafeBite HACCP (Offline‑first PWA)

Een supereenvoudig, **offline‑first** HACCP‑logboek voor kleine food vendors (zoals Colombia Vida). 
Slaat data lokaal op (localStorage), werkt als PWA (installeerbaar) en kan **CSV exporteren** of **dagrapport printen (PDF)**.

## Features
- Openings- en sluitingscheck
- Temperatuurmetingen (koelkast, vriezer, warme bewaring, bakolie) met drempelcontrole
- Schoonmaaklog, Allergenenlog, Correctieve acties
- Instellingen voor bedrijfsnaam/adres en drempelwaarden
- Export per log naar **CSV**
- **Dagrapport**: print/opslaan als PDF
- **Offline**: service worker + manifest (PWA)

## Gebruik (lokaal)
1. Open `index.html` in je browser (dubbelklikken werkt vaak, of via `npx http-server .`).
2. Ga naar **Instellingen** → vul bedrijfsnaam, adres, drempels in → **Opslaan**.
3. Voeg logs toe. Alles wordt lokaal opgeslagen in je browser.

## Deploy op Vercel (statisch)
1. Maak een GitHub repo en upload alle bestanden.
2. **Vercel → New Project → Import** je repo.
3. Framework: **Other** (of None). Build command: *leeg*. Output: **/** (root).
4. Deploy. `vercel.json` zorgt voor SPA routing.

## Deploy op Cloudflare Pages
1. Maak een nieuwe Pages site, koppel je repo.
2. Build command: *none*. Output directory: **/**.
3. Deploy.

## Supabase-backend
1. Maak een nieuw project op [Supabase](https://supabase.com/).
2. Voeg onderstaande SQL toe in de SQL editor om de tabellen aan te maken:

```sql
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  business_name text,
  address text,
  default_staff text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

create table if not exists public.usage_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  event_type text not null,
  payload jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc', now()) not null
);
```

3. Zet de **Project URL** en **anon public key** in je Vercel/Supabase `.env` als `SUPABASE_URL` en `SUPABASE_ANON_KEY` (of gelijknamige `NEXT_PUBLIC_` varianten).

## Let op
- Dit is een MVP en **geen juridisch advies**. Check lokale wet- en regelgeving (NVWA e.d.).
- Data staat in de browser (localStorage). Wil je teamgebruik/sync? Voeg later Supabase toe.

## Licentie
MIT
