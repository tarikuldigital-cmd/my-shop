"""Turns scripts/raw-products.txt into src/mocks/products.json (run: python3 scripts/build-mock-data.py)."""
import json, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
SUB = {
 "academic-reading": "cambridge-ielts-reading-answers-developer-guide cambridge-ielts-vocabulary-and-phrases-guide lis-ielts-reading-strategies-bangla-translated makkar-ielts-reading-volume-1 ielts-academic-reading-test-bymacarter makkar-ielts-reading-volume-2 makkar-ielts-reading-volume-3 ielts-advantage-reading-skills khans-ielts-reading-flash simon-master-ielts-reading",
 "general-reading": "makkar-ielts-reading-general",
 "academic-writing": "confidents-cambridge-ielts-writing-task-2-answers-developer cambridge-ielts-writing-task-1-answers-developer-guide makkar-ideas-for-essay-with-500-samples lizs-ielts-writing-task-1-and-2-bangla-translated ideas-for-ielts-essay-topics-bangla-translated makkar-ielts-writing-task-2-essays-2026-edition makkar-ielts-writing-task-1-graph-2026-edition makkar-ielts-writing-task-1-2-2026-edition ielts-journal-writing-task-2-adam-smith ielts-journal-writing-task-1-by-adam-smith ielts-writingtask-1-2-by-simon-braverman liz-ielts-grammar-and-eassay jibon-ielts-writing-task-2 makkar-ielts-essay-writing-task-2 makkar-ielts-graph-writing-task-1 ielts-writing-task-1and-2-by-simon-vravman-english-to-bangla ielts-advantage-writing-skills ielts-academic-writing-practice-by-sam-mecarter khans-ielts-writing-flash jibon-ielts-writing-task-1",
 "general-writing": "makkar-ielts-general-training-essays-letters makkar-ielts-general-training-essays-and-letters",
 "cue-card": "confidents-repeated-cue-cards-for-ielts-speaking sylheti-ielts-special-cue-card",
 "english-story": "5-world-famous-bestselling-story-books 3-best-selling-story-books harry-potter-8-books-series-premium-print-quality",
 "sat": "ramadan-deal-sat-combo-offer the-collage-panda-sat-math the-complete-guide-to-sat-reading sat-official-guide-2022",
 "gre": "ramadan-deal-gre-combo-offer-10-books ramadan-deal-gre-combo-offer-8-books gre-special-combo-package-13-books",
 "computer-based": "banglay-ielts-rashed-sir-combo-package cbt-official-cambridge-ielts-books computer-based-ielts-33-short-package computer-based-ielts-55-combo",
}
sub_of = {}
for sub, slugs in SUB.items():
    for s in slugs.split():
        sub_of.setdefault(s, []).append(sub)

products, order, cat = {}, [], None
for line in (root / "scripts/raw-products.txt").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    if line.startswith("@"):
        cat = line[1:]; continue
    slug, name, price, old, img = [x.strip() for x in line.split("|")]
    if slug in products:
        if cat not in products[slug]["categories"]:
            products[slug]["categories"].append(cat)
        continue
    m = re.match(r"(\d+)-", img)
    p = {
        "id": int(m.group(1)) if m else None,
        "slug": slug,
        "name": name,
        "price": int(price),
        "oldPrice": None if old == "-" else int(old),
        "images": [] if img == "-" else [img],
        "categories": [cat],
        "subcategories": sub_of.get(slug, []),
        "sku": None,
        "productType": "Physical",
        "brand": None,
        "description": None,
        "sold": 0,
        "variations": [],
    }
    products[slug] = p; order.append(slug)

# Facts read from the single fully-analysed product page (P0194)
p = products["sylheti-ielts-smart-solution-and-explanation-11-to-21"]
p["sku"] = "P0194"

# Products with no image have no upload timestamp; give them ids after the oldest known item so sorting is stable
oldest = min(x["id"] for x in products.values() if x["id"])
n = 0
for s in order:
    if products[s]["id"] is None:
        n += 1; products[s]["id"] = oldest - n
out = [products[s] for s in order]
(root / "src/mocks/products.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(out), "products;", sum(1 for x in out if not x["images"]), "without image;",
      sum(1 for x in out if len(x["categories"]) > 1), "in >1 category")
