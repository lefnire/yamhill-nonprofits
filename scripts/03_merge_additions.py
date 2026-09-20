#!/usr/bin/env python3
"""Step 4 of 4 (optional). Fold hand-researched community organizations into the
dataset.

The IRS Business Master File is complete for *registered* organizations in the
ten Yamhill County ZIP codes -- verified, only one row in the extract is absent
from the directory. What it structurally cannot contain is the unregistered
layer: fiscally sponsored projects, unincorporated volunteer groups, local
chapters filing under a national parent, and organizations formed after the
snapshot. Those live in data/additions/*.json and are merged here.

These records carry no EIN and no IRS fields. They are marked
`source: "community-research"` so the app can label them honestly.

Usage:  python scripts/03_merge_additions.py
Run after 02_assemble_dataset.py; it rewrites src/data/nonprofits.json in place.
"""
import glob
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATASET = ROOT / "src" / "data" / "nonprofits.json"
ADDITIONS = ROOT / "data" / "additions"

STOP = {"the", "of", "and", "a", "inc", "incorporated", "corp", "corporation",
        "association", "assoc", "foundation", "society", "club", "county",
        "oregon", "or", "for", "to", "in", "at", "area", "valley"}

BLOCKED = re.compile(
    r"(guidestar|causeiq|propublica|charitynavigator|nonprofitfacts|taxexemptworld"
    r"|opencorporates|bizapedia|greatnonprofits|charitycheck|501c3lookup)", re.I)


def key(name):
    """Order-insensitive bag of significant words, so 'Habitat for Humanity
    McMinnville Area' and 'McMinnville Area Habitat for Humanity' collide."""
    words = re.sub(r"[^a-z0-9 ]", " ", str(name or "").lower()).split()
    return frozenset(words) - STOP


def ok_url(u):
    u = (u or "").strip()
    if not re.match(r"^https?://[^\s]+\.[^\s]+", u) or BLOCKED.search(u):
        return None
    return u


def slug(name):
    return "add:" + re.sub(r"[^a-z0-9]", "", str(name).lower())[:48]


def main():
    data = json.load(open(DATASET))
    orgs = data["organizations"]
    valid = {c["id"] for c in data["categories"]}
    # Categories the taxonomy defines but nothing currently uses are still legal.
    valid |= {c["id"] for c in json.load(open(ROOT / "data" / "taxonomy.json"))["categories"]}

    seen = {key(o["name"]) for o in orgs}
    seen |= {key(o["aka"]) for o in orgs if o.get("aka")}
    seen |= {key(o["legalName"]) for o in orgs if o.get("legalName")}

    added, skipped = [], []
    for path in sorted(glob.glob(str(ADDITIONS / "*.json"))):
        for c in json.load(open(path)):
            name = (c.get("name") or "").strip()
            if not name:
                continue
            k = key(name)
            if k in seen:
                skipped.append((name, "already in directory"))
                continue
            if not c.get("evidenceUrl"):
                skipped.append((name, "no evidence url"))
                continue
            cats = [x for x in (c.get("categories") or []) if x in valid][:3]
            if not cats:
                skipped.append((name, "no valid category"))
                continue
            desc = (c.get("description") or "").strip()
            if not desc:
                skipped.append((name, "no description"))
                continue
            # registrationNote is deliberately NOT folded into the description: the
            # detail view states the registration status structurally, and the
            # "Part of" row names the parent, so appending it here would say the
            # same thing three times on one card.
            rec = {
                "id": slug(name),
                "name": name,
                "description": desc,
                "categories": cats,
                "city": c.get("city"),
                "state": "OR",
                "website": ok_url(c.get("website")),
                "email": (c.get("email") or None),
                "phone": (c.get("phone") or None),
                "parentOrg": c.get("parentOrg") or None,
                "sourceUrl": c.get("evidenceUrl"),
                "source": "community-research",
                "confidence": c.get("confidence") if c.get("confidence") in
                              ("high", "medium", "low") else "low",
            }
            orgs.append({k2: v for k2, v in rec.items() if v not in (None, "", [])})
            seen.add(k)
            added.append(name)

    orgs.sort(key=lambda o: o["name"].lower())

    # Recount categories over the merged set.
    tax = json.load(open(ROOT / "data" / "taxonomy.json"))["categories"]
    counts = {}
    for o in orgs:
        for c in o["categories"]:
            counts[c] = counts.get(c, 0) + 1
    data["categories"] = [{**c, "count": counts[c["id"]]} for c in tax if counts.get(c["id"])]
    data["organizations"] = orgs
    data["count"] = len(orgs)
    json.dump(data, open(DATASET, "w"), indent=1, ensure_ascii=False)

    print(f"added {len(added)}, skipped {len(skipped)}, total now {len(orgs)}")
    for n in added:
        print("  +", n)
    if skipped:
        print("\nskipped:")
        for n, why in skipped:
            print(f"  - {n}  ({why})")


if __name__ == "__main__":
    main()
