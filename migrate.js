#!/usr/bin/env node
// Migrační script: starý Supabase → nový Supabase
// Spustit: node migrate.js

const OLD_URL = 'https://nqfyyotcjianufkydrrj.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZnl5b3RjamlhbnVma3lkcnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTEyNjUwNSwiZXhwIjoyMDkwNzAyNTA1fQ.hcMB40zzKRy0Rq82hY3fACThJLAFg01nizPK2a8LYos';

const NEW_URL = 'https://xyhfactasqgfbtmglgsu.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5aGZhY3Rhc3FnZmJ0bWdsZ3N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM3NDMzNiwiZXhwIjoyMDk0OTUwMzM2fQ.JsPJvc0WRmeyc32L0hfITEYGd-AwfX-eiD_h6XMEYMA';

const headers = (key, extra = {}) => ({
  'Authorization': `Bearer ${key}`,
  'apikey': key,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
  ...extra
});

async function api(base, key, path, method = 'GET', body = null, extra = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: headers(key, extra),
    body: body ? JSON.stringify(body) : null
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const old = (path, method, body, extra) => api(OLD_URL, OLD_KEY, path, method, body, extra);
const neo = (path, method, body, extra) => api(NEW_URL, NEW_KEY, path, method, body, extra);

function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }

async function checkSchema() {
  try {
    await neo('/rest/v1/profiles?select=id&limit=1');
    return true;
  } catch {
    return false;
  }
}

async function exportData() {
  log('Export: auth users...');
  let allUsers = [];
  let page = 0;
  while (true) {
    const res = await old(`/auth/v1/admin/users?page=${page}&per_page=50`);
    const users = res.users || res;
    if (!users.length) break;
    allUsers = allUsers.concat(users);
    if (users.length < 50) break;
    page++;
  }
  log(`  → ${allUsers.length} uživatelů`);

  log('Export: profiles...');
  const profiles = await old('/rest/v1/profiles?select=*');
  log(`  → ${profiles.length} profilů`);

  const today = new Date().toISOString().split('T')[0];
  log(`Export: reservations od ${today}...`);
  const reservations = await old(`/rest/v1/reservations?date=gte.${today}&select=*&order=date.asc`);
  log(`  → ${reservations.length} rezervací`);

  const now = new Date().toISOString();
  log('Export: invite tokens (platné)...');
  const inviteTokens = await old(`/rest/v1/invite_tokens?expires_at=gte.${now}&select=*`);
  log(`  → ${inviteTokens.length} pozvánek`);

  log('Export: gym settings...');
  const gymSettings = await old('/rest/v1/gym_settings?select=*');
  log(`  → nastavení OK`);

  return { users: allUsers, profiles, reservations, inviteTokens, gymSettings };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function importData({ users, profiles, reservations, inviteTokens, gymSettings }) {
  // 1. Vytvoř auth users se stejnými UUID
  log(`Import: vytváření ${users.length} uživatelů...`);
  let created = 0, skipped = 0;
  for (const user of users) {
    try {
      await neo('/auth/v1/admin/users', 'POST', {
        id: user.id,
        email: user.email,
        email_confirm: true,
        user_metadata: user.raw_user_meta_data || {},
        app_metadata: user.raw_app_meta_data || {},
        password: `Temp${Math.random().toString(36).slice(2, 10)}Aa1!`
      });
      created++;
    } catch (e) {
      if (e.message.includes('already') || e.message.includes('409')) {
        skipped++;
      } else {
        log(`  WARN: user ${user.email}: ${e.message}`);
        skipped++;
      }
    }
    await sleep(200);
  }
  log(`  → vytvořeno: ${created}, přeskočeno (existuje): ${skipped}`);

  // 2. Upsert profiles (trigger mohl vytvořit základní záznamy)
  if (profiles.length > 0) {
    log(`Import: ${profiles.length} profilů (upsert)...`);
    await neo('/rest/v1/profiles', 'POST', profiles, {
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    });
    log('  → OK');
  }

  // 3. Rezervace
  if (reservations.length > 0) {
    log(`Import: ${reservations.length} rezervací...`);
    await neo('/rest/v1/reservations', 'POST', reservations, {
      'Prefer': 'resolution=ignore-duplicates,return=minimal'
    });
    log('  → OK');
  } else {
    log('Import: žádné budoucí rezervace k přenesení');
  }

  // 4. Invite tokens
  if (inviteTokens.length > 0) {
    log(`Import: ${inviteTokens.length} invite tokenů...`);
    await neo('/rest/v1/invite_tokens', 'POST', inviteTokens, {
      'Prefer': 'resolution=ignore-duplicates,return=minimal'
    });
    log('  → OK');
  }

  // 5. Gym settings (update existujícího záznamu id=1)
  if (gymSettings.length > 0) {
    log('Import: gym settings...');
    const s = gymSettings[0];
    await neo('/rest/v1/gym_settings?id=eq.1', 'PATCH', {
      max_overlap: s.max_overlap,
      max_advance_days: s.max_advance_days,
      opening_hour: s.opening_hour,
      closing_hour: s.closing_hour,
      slot_minutes: s.slot_minutes,
      min_duration_minutes: s.min_duration_minutes,
      max_duration_minutes: s.max_duration_minutes,
      opening_minute: s.opening_minute ?? 0,
      closing_minute: s.closing_minute ?? 0
    }, { 'Prefer': 'return=minimal' });
    log('  → OK');
  }

  // 6. Password reset pro všechny uživatele
  log(`Odesílám reset hesla ${users.length} uživatelům...`);
  let sent = 0;
  for (const user of users) {
    try {
      await neo('/auth/v1/recover', 'POST', {
        email: user.email,
        gotrue_meta_security: {}
      }, { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5aGZhY3Rhc3FnZmJ0bWdsZ3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzQzMzYsImV4cCI6MjA5NDk1MDMzNn0.9_wNAOT-3GivjJ9667Ivx5NAYqS6FxE_JGYlxvw3XMw' });
      sent++;
    } catch (e) {
      log(`  WARN: reset ${user.email}: ${e.message}`);
    }
    await sleep(500);
  }
  log(`  → odesláno: ${sent}/${users.length}`);
}

async function main() {
  console.log('\n=== MIGRACE GYM RESERVATION SYSTEM ===\n');

  log('Ověřuji spojení se starým Supabase...');
  try {
    await old('/rest/v1/gym_settings?select=id&limit=1');
    log('  → starý projekt OK');
  } catch (e) {
    console.error(`CHYBA: Nelze se připojit k starému Supabase: ${e.message}`);
    process.exit(1);
  }

  log('Kontroluji schéma nového Supabase...');
  const schemaReady = await checkSchema();
  if (!schemaReady) {
    console.error('\n❌ CHYBA: Schéma nového Supabase není připravené!');
    console.error('   → Spusť SQL z migration_to_new_supabase.sql (ČÁST A) v Supabase SQL Editoru');
    console.error('   → Poté spusť tento script znovu\n');
    process.exit(1);
  }
  log('  → nový projekt - schéma OK');

  log('\n--- EXPORT ZE STARÉHO PROJEKTU ---');
  const data = await exportData();

  log('\n--- IMPORT DO NOVÉHO PROJEKTU ---');
  await importData(data);

  console.log('\n✅ MIGRACE DOKONČENA!\n');
  console.log('Uživatelé obdrželi email pro reset hesla.');
  console.log('Nezapomeň:');
  console.log('  1. Nastavit RESEND_API_KEY v Edge Functions nového projektu');
  console.log('  2. Nasadit Edge Function: supabase functions deploy notify-cancellation --project-ref xyhfactasqgfbtmglgsu');
  console.log('  3. GitHub Secrets jsou již aktualizovány\n');
}

main().catch(e => { console.error('FATÁLNÍ CHYBA:', e); process.exit(1); });
