#!/usr/bin/env python3
"""Mutation tests: remove one permission/safety condition from a COPY of the migrations, run the DB suite,
and require it to FAIL. A mutation that still passes means the rule is untested. Usage: python3 mutations.py [name ...]"""
import os, shutil, subprocess, sys, tempfile
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MIG = os.path.join(ROOT, "supabase", "migrations")
# name: (file, exact text to replace, replacement)
MUTATIONS = {
  "community: monks/minors not excluded": ("0008_community.sql", "(m.monastic_kind <> 'none' or m.is_minor)", "false"),
  "community: send_message ignores block": ("0008_community.sql",
     "if app.is_blocked_between(me, other) or not app.are_connected(me, other) or not app.community_can(other, 'community.p2p_chat') then\n      raise exception 'cannot message",
     "if false then\n      raise exception 'cannot message"),
  "community: DM without connection": ("0008_community.sql",
     "or app.is_blocked_between(me, p_other) or not app.are_connected(me, p_other) then", "or app.is_blocked_between(me, p_other) then"),
  "community: messages readable by anyone": ("0008_community.sql",
     "using (app.is_conv_member(conversation_id) and removed_at is null)", "using (true)"),
  "community: send into any conversation": ("0008_community.sql",
     "if not app.is_conv_member(p_conv) then raise exception 'not a member'", "if false then raise exception 'not a member'"),
  "community: connections-only posts public": ("0008_community.sql",
     "(p.visibility = 'public' or app.are_connected(app.current_person_id(), p.author))", "true"),
  "community: call signals readable by anyone": ("0008_community.sql", "using (to_person = app.current_person_id())", "using (true)"),
  "community: call permission ignored": ("0008_community.sql",
     "or (select call_permission from public.community_profiles where person_id = other) <> 'connections' then", "then"),
  "community: moderation queue open": ("0008_community.sql",
     "begin\n  if not app.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;\n  return query select r.id",
     "begin\n  return query select r.id"),
  "community: contact inbox readable by staff": ("0008_community.sql",
     "app.has_permission(temple_id, 'contact_inbox.manage', 'T') or sender_person_id", "app.is_member(temple_id) or sender_person_id"),
  "community: no message rate limit": ("0008_community.sql",
     "where sender = me and created_at > now() - interval '1 minute';\n  perform app.rate_limit(n, 20);",
     "where sender = me and created_at > now() - interval '1 minute';"),
}

def run(name):
    f, old, new = MUTATIONS.get(name, (None, None, None))
    tmp = tempfile.mkdtemp(); os.chmod(tmp, 0o755)   # the postgres OS user must be able to read the copy
    try:
        for fn in os.listdir(MIG): shutil.copy(os.path.join(MIG, fn), tmp); os.chmod(os.path.join(tmp, fn), 0o644)
        if f:
            p = os.path.join(tmp, f); s = open(p, encoding="utf8").read()
            if s.count(old) != 1: return f"BROKEN MUTATION (text found {s.count(old)}x)"
            open(p, "w", encoding="utf8").write(s.replace(old, new))
        r = subprocess.run(["bash", os.path.join(ROOT, "supabase/tests/run.sh")], env={**os.environ, "MIGRATIONS_DIR": tmp},
                           capture_output=True, text=True)
        out = r.stdout + r.stderr
        if r.returncode == 0: return "SURVIVED (tests still pass)" if f else "CONTROL PASSED"
        if "FAILED: test " not in out: return "INVALID (failed before tests ran: " + out.strip().splitlines()[-1][:90] + ")"
        msg = next((l for l in out.splitlines() if "ASSERT FAILED" in l), None) or next((l for l in out.splitlines() if "ERROR" in l), "failed")
        return "KILLED: " + msg.split("ERROR:")[-1].strip()[:110]
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

ctl = run("__control__"); print("control (no mutation):", ctl)
if ctl != "CONTROL PASSED": sys.exit(2)
names = sys.argv[1:] or list(MUTATIONS)
bad = 0
for n in names:
    res = run(n); print(f"{n}: {res}"); bad += not res.startswith("KILLED")
print(f"{len(names) - bad}/{len(names)} mutations killed")
sys.exit(1 if bad else 0)
