import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync(new URL("../supabase/test/000_isolated_test.sql", import.meta.url), "utf8");
const nachzug = readFileSync(new URL("../supabase/test/001_advisor_least_privilege.sql", import.meta.url), "utf8");

test("Testschema entzieht anon die Freigabe und fixiert guthaben_von", () => {
  assert.match(schema, /revoke all on function public\.approve_membership_request\(uuid\) from public, anon;/);
  assert.match(schema, /grant execute on function public\.approve_membership_request\(uuid\) to authenticated;/);
  assert.match(schema, /set search_path = pg_catalog/);
  assert.doesNotMatch(schema, /grant execute on function public\.approve_membership_request\(uuid\) to anon/);
  assert.doesNotMatch(schema, /grant execute on function public\.approve_membership_request\(uuid\) to public/);
  assert.match(schema, /grant execute on function public\.meine_empfehlungen\(\) to authenticated;/);
  assert.match(schema, /revoke all on function public\.guthaben_von\(jsonb\) from public, anon, authenticated;/);
});

test("Nachzug ist klein, leer-only, und ändert dieselben drei Funktionen", () => {
  assert.match(nachzug, /ronyqrmfgzuqfksxrwhu/);
  assert.match(nachzug, /if n <> 0 then/);
  assert.match(nachzug, /revoke all on function public\.approve_membership_request\(uuid\) from public, anon;/);
  assert.match(nachzug, /grant execute on function public\.approve_membership_request\(uuid\) to authenticated;/);
  assert.match(nachzug, /revoke all on function public\.meine_empfehlungen\(\) from public, anon;/);
  assert.match(nachzug, /grant execute on function public\.meine_empfehlungen\(\) to authenticated;/);
  assert.match(nachzug, /alter function public\.guthaben_von\(jsonb\) set search_path = pg_catalog;/);
  assert.match(nachzug, /revoke all on function public\.guthaben_von\(jsonb\) from public, anon, authenticated;/);
  assert.match(nachzug, /grant execute on function public\.guthaben_von\(jsonb\) to service_role;/);
  assert.doesNotMatch(nachzug, /zasbdvtsxgimcezotlsi/);
  assert.doesNotMatch(nachzug, /insert into auth\.users/i);
});
