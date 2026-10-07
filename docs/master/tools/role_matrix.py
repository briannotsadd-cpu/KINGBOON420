#!/usr/bin/env python3
"""Validate docs/master/role_permissions.yaml and render the matrix table in ROLE_PERMISSION_MATRIX.md.

Usage:
  python3 docs/master/tools/role_matrix.py           # validate, then rewrite the generated table in place
  python3 docs/master/tools/role_matrix.py --check   # validate, and exit 1 if the markdown table is stale

Requires PyYAML. Wave 2 (Agent 16) wires --check into CI.
"""
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
YAML_PATH = ROOT / "role_permissions.yaml"
MD_PATH = ROOT / "ROLE_PERMISSION_MATRIX.md"
BEGIN = "<!-- GENERATED from role_permissions.yaml — do not edit the table by hand -->"
END = "Rules that the table cannot express:"

SCOPE_RE = re.compile(r"^(?P<scope>[SDTACP](?:\+[SDTACP])?)(?:\((?P<cond>[a-z_]+)\))?$")
MANAGEMENT = ("quest.create", "quest.request", "quest.assign", "quest.verify", "quest.manage", "event.manage",
              "member.manage", "availability.set_others", "points.award_community", "presence.set_others")
LAY_ONLY = ("finance.approve", "reward.manage", "community.participate", "community.p2p_chat", "community.calls",
            "community.public_profile")
ABBR = {
    "abbot": "abbot", "deputy_abbot": "deputy", "abbot_assistant": "asst", "monk_secretary": "secr",
    "bhikkhu": "bhik", "samanera": "sam", "visiting_monastic": "visit", "waiyawatchakon": "waiya",
    "facility_manager": "fac_mgr", "technician": "tech", "department_lead": "dept_lead", "housekeeper": "house",
    "kitchen_staff": "kitchen", "gardener": "garden", "driver": "driver", "ceremony_lead": "cer_lead",
    "ceremony_team": "cer_team", "undertaker": "undert", "office_staff": "office", "accountant": "acct",
    "temple_admin": "t_admin", "security_guard": "guard", "traffic_staff": "traffic", "staff_general": "staff",
    "temple_boy": "t_boy", "lay_resident": "resident", "volunteer": "vol", "community_member": "comm",
}


def load():
    d = yaml.safe_load(YAML_PATH.read_text(encoding="utf-8"))
    roles = d["modes"]["monastic"] + d["modes"]["community_staff"]
    groups = d["groups"]

    def expand(name):
        out = []
        for member in groups[name]:
            out += expand(member) if member.startswith("@") else [member]
        return out

    errors, rows = [], []
    for perm, grant in d["grants"].items():
        cells = {}
        for key, val in grant.items():  # groups first; explicit roles override
            if key.startswith("@"):
                if key not in groups:
                    errors.append(f"{perm}: unknown group {key}")
                    continue
                for role in expand(key):
                    cells[role] = str(val)
        for key, val in grant.items():
            if key.startswith("@"):
                continue
            if key not in roles:
                errors.append(f"{perm}: unknown role {key}")
            if str(val) == "-":
                cells.pop(key, None)
            else:
                cells[key] = str(val)
        for role, val in cells.items():
            m = SCOPE_RE.match(val)
            if not m:
                errors.append(f"{perm}.{role}: bad scope value {val!r}")
            elif m.group("cond") and m.group("cond") not in d["condition_keys"]:
                errors.append(f"{perm}.{role}: unknown condition {m.group('cond')!r}")
        rows.append((perm, cells))

    grants = dict(rows)
    for code in d["restricted"] + d["minor_overrides"]["deny"]:
        if code not in grants:
            errors.append(f"{code} is referenced but has no grants row")
    monastic = set(d["modes"]["monastic"])
    for perm in MANAGEMENT:
        if "samanera" in grants.get(perm, {}):
            errors.append(f"invariant: samanera holds management permission {perm}")
    for perm in LAY_ONLY:
        if monastic & set(grants.get(perm, {})):
            errors.append(f"invariant: monastic role holds lay-only permission {perm}")
    if grants["quest.view"].get("undertaker") != "A":
        errors.append("invariant: undertaker must be assigned-only on quest.view")
    if set(grants["audit.view"]) != {"abbot"}:
        errors.append("invariant: audit.view is abbot-only")
    return d, roles, rows, errors


def render(d, roles, rows):
    lines = ["| Permission | " + " | ".join(ABBR.get(r, r) for r in roles) + " |",
             "|---|" + "---|" * len(roles)]
    for perm, cells in rows:
        tag = " 🔒" if perm in d["restricted"] else ""
        lines.append(f"| `{perm}`{tag} | " + " | ".join(cells.get(r, "—") for r in roles) + " |")
    lines.append(f"\n<!-- {len(rows)} permissions × {len(roles)} roles -->")
    return "\n".join(lines) + "\n\n"


def main():
    d, roles, rows, errors = load()
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    md = MD_PATH.read_text(encoding="utf-8")
    start = md.index(BEGIN) + len(BEGIN) + 1
    end = md.index(END)
    new_md = md[:start] + render(d, roles, rows) + md[end:]
    if "--check" in sys.argv:
        if new_md != md:
            print("ROLE_PERMISSION_MATRIX.md table is stale; run tools/role_matrix.py", file=sys.stderr)
            return 1
        print(f"ok: {len(rows)} permissions × {len(roles)} roles, invariants hold, table current")
        return 0
    MD_PATH.write_text(new_md, encoding="utf-8")
    print(f"rendered {len(rows)} permissions × {len(roles)} roles")
    return 0


if __name__ == "__main__":
    sys.exit(main())
