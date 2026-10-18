"""Build the portable Markdown/HTML usability review from observed findings."""
import csv
import html
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
findings = json.loads((HERE / 'findings.json').read_text(encoding='utf-8'))
session = json.loads((HERE / 'session.json').read_text(encoding='utf-8'))
pack = (HERE / 'Participant-test-pack.md').read_text(encoding='utf-8')
esc = html.escape
high = sum(f['priority'] == 'High' for f in findings)
medium = len(findings) - high
for f in findings:
    for evidence in f['evidence']:
        assert (HERE / evidence).is_file(), evidence

with (HERE / 'Findings-register.csv').open('w', encoding='utf-8-sig', newline='') as stream:
    fields = ['id','priority','area','type','title','scope','observed','impact','change','acceptance','evidence','source']
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    for f in findings:
        writer.writerow({**f, 'evidence': '; '.join(f['evidence'])})

intro = """# What’s Cooking — broader intuitive-use review

18 October 2026 · Expert walkthrough and exploratory testing · Source 1.0.4 / 92c93b4

## Assessment

The next improvement should make the person, date and state of every meal obvious. The app can now do more than a new user can reliably discover: important conditions are hidden in explanations, shopping completion contradicts itself, an interrupted log is lost, and a past week can look populated before any actual meals were recorded.

This review contains **17 prioritised findings: 7 High and 10 Medium**. They include observed behaviour problems, missing controls and usability opportunities; they are not 17 equivalent code defects. Priority reflects likely impact on the tested household goals, not measured frequency among users.

This was an expert review using realistic synthetic scenarios, **not a study with recruited participants**. No participant quotes, success rates or time-on-task claims are invented. The [participant test pack](Participant-test-pack.md) provides three scenarios, five post-task questions, an exploratory checklist and a note sheet for real sessions.

## Two targets, kept separate

- **Live:** [whatscooking.expo.app](https://whatscooking.expo.app). After reload it served the previous design-refresh bundle, entry-b2a1d2ebf8f585da3f7700b986cfa70f.js. Its Log and Settings did not expose the supplied 1.0.4 additions.
- **Current source:** 92c93b4, version 1.0.4. Its production web export was exercised at the [local review preview](http://127.0.0.1:8089), with bundle entry-e7795f4b76daa1c1808cb35926e33003.js.
- The source-only additions were tested locally rather than counted individually as missing live features. **UX01 is the release mismatch.** The rest of the review concerns broader household tasks.

## Coverage and verification

| Area | Exercised goals |
|---|---|
| First use / Family | Minimal household, diet and child allergy, two children, school boxes, cook role/language, optional favourites |
| Today / planning | Quick/light choices, reasons, pantry selection, plan versus cooked state, tomorrow confirmation |
| Week | Current and past views, named child boxes, repeats, bulk actions and status interpretation |
| Shopping | Planned ingredients, staple assumptions, manual item, copy feedback, bought state and recovery, date range |
| Cook | Planner preview, main handoff location, actual cook page, alternate choices and missing-item entry; no message sent |
| Log / Memory | No-AI entry, past/ordered meal, diner attribution, reload interruption, date correction, saved reaction, filters |
| Return value | Private recap, sparse/empty data, finding recap/order after customisation, preferences in everyday language |
| Layout / input | Desktop, 390 × 844, 360 × 800 home, Space activation, Escape and focus return |

- **177 tests passed across 9 suites**, with no failures. [Raw automated results](test-results.json).
- Lint and type checking passed; the current web export was generated and opened successfully. This does not certify native compilation or runtime for 1.0.4.
- At **360 px**, document width was 360 px; the primary meal action was 48 px high and ended at about 679 px in an 800 px opening viewport. [Metrics](small-phone-metrics.json), [small-phone view](35-current-home-360.png).
- Current home preferences and household/meal data persisted after reload. Unsaved logging state did not.
- The latest [food-week recap](30-current-food-week.png) correctly separated ordered-in from home-cooked food; [last week’s empty state](31-recap-empty-week.png) was honest.
- Explicit future dates were refused. The separate year-guessing ambiguity is UX16, not a claim that future validation failed.

## Changes to prioritise

1. **Restore trustworthy state:** fix bought-item reappearance, retain an unfinished meal and distinguish past records from suggestions (UX04, UX05, UX07).
2. **Carry essential context:** show required adaptations before choosing a dish and include dietary instructions in the cook handoff (UX02, UX03).
3. **Let the user tell the truth:** choose who actually ate each meal, including one adult (UX06).
4. **Keep tasks reachable:** put the cook action within reach; preserve recap and ordering access when home cards are hidden (UX08, UX15).
5. **Reduce decisions:** review ingredients individually, carry the chosen planning range, simplify child setup, complete dish browsing and use everyday explanations (UX10–UX14).
6. **Release the intended experience:** separately verify that the public URL serves the intended version (UX01). No release was published during this review.

## Finding register

"""
lines = [intro, '| ID | Priority | Area | Finding |', '|---|---|---|---|']
for f in findings:
    lines.append(f"| {f['id']} | {f['priority']} | {f['area']} | {f['title']} |")
lines.append('\n## Detailed evidence and acceptance checks\n')
for f in findings:
    evidence = ', '.join(f'[{p}]({p})' for p in f['evidence'])
    lines.extend([
        f"### {f['id']} — {f['title']}",
        f"**{f['priority']} · {f['type']} · {f['scope']}**\n",
        f"**Observed:** {f['observed']}\n",
        f"**Why it matters:** {f['impact']}\n",
        f"**Suggested change:** {f['change']}\n",
        f"**Retest:** {f['acceptance']}\n",
        f"Evidence: {evidence}. Source pointer: {f['source']}.\n"
    ])
tail = """## A coherent direction for the app

Use a consistent meal workspace across Today, Week, the cook and Memory:

- Start with **which day, which meal and who is eating**.
- Show the chosen dish with a short reason and any required change in plain words.
- Once planned, offer **Review ingredients** and **Tell the cook** beside that same meal.
- After eating, offer **Log what actually happened**, including diners, ordered-in status and leftovers.
- After saving, show **what was saved** and a reachable **Change this meal** action.

These are design recommendations, not implemented screens. A compact status line such as “Tomorrow dinner · 3 people · Planned” should do more work than fading, pin icons or a legend at the bottom of a week.

For first use, a useful first decision can precede detailed household configuration. Offer progressive setup for school/cook details, while keeping diet/allergy boundaries clear. Keep the existing food imagery and personal covers; further visual decoration is a lower priority than understanding and recovery.

## Follow-up opportunities, not newly verified defects

- The logging picker explicitly limits a plate to four dishes; planning defaults to three ranked choices. Test a real thali and a household that wants more alternatives, then decide the appropriate limits.
- Long-press swapping is described at the bottom of Week. Provide visible Move/Swap controls and a keyboard equivalent; drag-and-drop can complement them.
- Food-week statistics would benefit from “Based on 1 logged meal” coverage, a direct route from Memory, and drill-down into the meals behind a count. Keep the agreed private/non-shareable behaviour.
- Pantry choices need an obvious “See matching meals” return, especially when selection changes suggestions above the current scroll position.
- A simpler wording distinction between **must avoid** and **prefer less** would help family preference setup. “Less spicy for the kids” currently previews “less spice” while the scope control remains Whole family; have participants explain the scope before saving.
- Whole-week ingredient-first planning, school-meal refinements, additional commerce links and receiving shared items remain backlog topics. **No Blinkit/BigBasket/Zomato share/API research was performed in this review.**
- Multi-device joining/sync remains the explicitly deferred product boundary, not a newly discovered implementation defect. Country-aware phone validation was superseded by removal of phone numbers.
- Have knowledgeable reviewers check dish/allergen metadata. This walkthrough verified selected UI boundaries, not the safety of the entire catalogue.

## What remains unverified

No physical Android/iPhone, native build for 1.0.4, device keyboard, background lifecycle or screen-reader session was available. No real Gemini key, paid AI call, real message, purchase, family deletion or personal photo was used. Full offline, storage-quota and low-memory behaviour were not retested. No backend/sync/security audit or complete rerun of the original FSD matrix was performed.

An extra browser Back and temporary accessibility-snapshot/viewport artefacts were excluded from findings rather than reported as product defects. Final small-screen measurements were taken against the intended app at 360 px.

## Deliverables and next research step

- [Interactive review](Review.html) — filter findings and inspect evidence.
- [Participant test pack](Participant-test-pack.md) — three scenarios, five questions, checklist and note sheet.
- [Findings register](Findings-register.csv), [structured findings](findings.json), [session and scope](session.json).
- [Earlier FSD and design reviews](../README.md).

Run the three goal-based sessions with actual household planners, including different digital confidence levels and someone using accessibility settings. Give only the goal, collect actual behaviour and ease ratings, and retest the same goals after changes. Use participant observations to refine priorities; do not infer abandonment rates from this expert walkthrough.

Review artifacts were added; application source was not changed and no deployment was made.
"""
lines.append(tail)
(HERE / 'UX-review.md').write_text('\n'.join(lines), encoding='utf-8')

def simple_pack(text):
    """Small renderer for this plain, controlled facilitator document."""
    parts, in_list, in_table = [], False, False
    for line in text.splitlines():
        if not line.strip():
            if in_list: parts.append('</ul>'); in_list = False
            if in_table: parts.append('</tbody></table></div>'); in_table = False
            continue
        if line.startswith('|'):
            cells = [x.strip() for x in line.strip().strip('|').split('|')]
            if all(re.fullmatch(r':?-+:?', x) for x in cells): continue
            if not in_table:
                parts.append('<div class="table-scroll"><table><thead><tr>' + ''.join('<th>'+esc(c)+'</th>' for c in cells) + '</tr></thead><tbody>')
                in_table = True
            else:
                parts.append('<tr>' + ''.join('<td>'+esc(c)+'</td>' for c in cells) + '</tr>')
            continue
        if line.startswith('#'):
            depth = min(4, len(line) - len(line.lstrip('#')))
            parts.append(f'<h{depth}>{esc(line.lstrip("# ").strip())}</h{depth}>')
        elif line.startswith('- '):
            if not in_list: parts.append('<ul>'); in_list = True
            body = line[2:]
            if body.startswith('[ ] '):
                parts.append('<li class="check"><label><input type="checkbox"> '+esc(body[4:])+'</label></li>')
            else: parts.append('<li>'+esc(body)+'</li>')
        else: parts.append('<p>'+esc(line)+'</p>')
    if in_list: parts.append('</ul>')
    if in_table: parts.append('</tbody></table></div>')
    return '\n'.join(parts)

cards = []
for f in findings:
    evidence = ''.join(f'<a class="evidence" href="{esc(p)}" target="_blank" rel="noopener">{esc(p)}</a>' for p in f['evidence'])
    thumb = next((p for p in f['evidence'] if p.endswith('.png')), None)
    image = f'<a href="{esc(thumb)}" target="_blank" rel="noopener"><img class="thumb" loading="lazy" src="{esc(thumb)}" alt="Evidence for {f["id"]}: {esc(f["title"])}"></a>' if thumb else ''
    cards.append(f'''<article class="finding" data-priority="{f['priority']}" data-area="{esc(f['area'])}">
<div class="card-head"><span class="badge {f['priority'].lower()}">{f['priority']}</span><span class="meta">{f['id']} · {esc(f['area'])} · {esc(f['type'])}</span></div>
<h3>{esc(f['title'])}</h3><p class="scope">{esc(f['scope'])}</p><p>{esc(f['observed'])}</p>
<details><summary>Suggested change and retest</summary><div class="detail-body">{image}<p><strong>Impact.</strong> {esc(f['impact'])}</p><p><strong>Change.</strong> {esc(f['change'])}</p><p><strong>Acceptance.</strong> {esc(f['acceptance'])}</p><div class="evidence-list">{evidence}</div><p class="source">{esc(f['source'])}</p></div></details></article>''')
areas = ''.join(f'<option>{esc(a)}</option>' for a in sorted({f['area'] for f in findings}))
page = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>What’s Cooking · intuitive-use review</title><style>
:root{--ink:#293127;--muted:#656d61;--bg:#f8f5ed;--line:#dedfd3;--accent:#98462d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,sans-serif}a{color:var(--accent);text-underline-offset:3px}button,input,select{font:inherit}button,a,input,select,summary{outline-offset:4px}
.wrap{max-width:1120px;margin:auto;padding:32px 24px}header{padding:35px 0 26px}.eyebrow{font-size:12px;letter-spacing:2px;font-weight:800;color:var(--accent)}
h1{font:clamp(34px,5vw,61px)/1.1 Georgia,serif;max-width:850px;margin:18px 0}h2{font:32px/1.2 Georgia,serif;margin:35px 0 18px}h3{font-size:21px;line-height:1.35;margin:13px 0 4px}p{margin:10px 0 17px}.lead{font-size:20px;max-width:820px}.meta,.scope,.source{font-size:13px;color:var(--muted)}.scope{margin:0 0 14px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:25px 0}.stat{background:#fff;border:1px solid var(--line);border-radius:16px;padding:17px}.stat strong{display:block;font:34px Georgia,serif}.stat span{font-size:13px}
.notice{padding:20px 24px;border-left:5px solid var(--accent);background:#f0e6d7;border-radius:0 15px 15px 0}.notice h2{font:20px system-ui,sans-serif;margin:0 0 6px}.links{display:flex;gap:20px;flex-wrap:wrap;margin:22px 0}
.filters{position:sticky;top:0;z-index:2;display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:14px 0;background:var(--bg);border-bottom:1px solid var(--line)}button{min-height:44px;border:1px solid var(--line);border-radius:10px;padding:8px 16px;background:#fff;color:var(--ink);cursor:pointer}button[aria-pressed=true]{background:var(--accent);color:white;border-color:var(--accent)}select,input[type=search]{min-height:44px;border:1px solid var(--line);border-radius:9px;padding:8px 12px;background:#fff;color:var(--ink)}input[type=search]{flex:1;min-width:200px}.filter-label{font-size:13px;font-weight:700}
.count{font-size:14px;color:var(--muted)}.finding{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px;margin:18px 0}.finding[hidden]{display:none}.card-head{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.badge{font-size:12px;letter-spacing:.6px;text-transform:uppercase;border-radius:6px;padding:3px 10px;font-weight:800}.high{background:#f4ddd4;color:#793723}.medium{background:#e8efdf;color:#405a34}summary{cursor:pointer;font-weight:700;color:var(--accent);padding:10px 0;min-height:44px}.detail-body{border-top:1px solid var(--line);padding-top:15px;display:flow-root}.thumb{float:right;width:130px;max-height:220px;object-fit:contain;object-position:top;border:1px solid var(--line);margin:0 0 16px 25px;background:#f8f5ed}.evidence-list{display:flex;gap:8px;flex-wrap:wrap}.evidence{font-size:12px;padding:4px 8px;background:#f3f0e8;border-radius:6px;overflow-wrap:anywhere}.source{overflow-wrap:anywhere}
.method{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:25px 0}.panel{border:1px solid var(--line);border-radius:16px;padding:22px;background:#f1f3ea}.panel h3{margin-top:0}
table{border-collapse:collapse;width:100%;font-size:14px;background:white}th,td{border:1px solid var(--line);padding:14px;text-align:left;vertical-align:top}th{background:#e8eddf}.table-scroll{overflow-x:auto}#materials{border-top:2px solid var(--line);margin-top:45px;padding-top:10px}#materials h1{font:36px Georgia,serif}#materials h2{font:27px Georgia,serif}.check{list-style:none;margin-left:-20px}.check label{display:flex;gap:10px;padding:5px 0}.check input{margin-top:7px;width:18px;height:18px;flex:none}.footer{margin-top:40px;border-top:1px solid var(--line);padding:25px 0;color:var(--muted);font-size:13px}
@media(max-width:650px){.wrap{padding:20px 16px}.stats{grid-template-columns:1fr 1fr}.method{grid-template-columns:1fr}.finding{padding:18px}.filters{position:static}.thumb{float:none;width:100%;max-height:280px;margin:0 0 15px}.lead{font-size:18px}}@media print{.filters,.links{display:none}.finding{break-inside:avoid}details:not([open]) .detail-body{display:block}}
</style></head><body><main class="wrap">
<header><div class="eyebrow">WHAT’S COOKING · 18 OCTOBER 2026</div><h1>Make the next step feel obvious.</h1><p class="lead">A broader review of first use, planning, shopping, cooking, logging and returning to the family’s food history.</p><p class="meta">Expert cognitive walkthrough · synthetic households · no recruited participant study</p>
<div class="stats"><div class="stat"><strong>17</strong><span>prioritised findings & gaps</span></div><div class="stat"><strong>7</strong><span>High priority</span></div><div class="stat"><strong>177</strong><span>automated tests passed</span></div><div class="stat"><strong>3</strong><span>realistic test scenarios</span></div></div>
<div class="notice"><h2>The live URL is serving an older release.</h2><p>The public app loaded the earlier design-refresh bundle. The supplied 1.0.4 source was reviewed separately in a local production build. Missing live additions are recorded once as UX01, not counted as separate regressions.</p></div>
<nav class="links" aria-label="Review resources"><a href="UX-review.md">Full written review</a><a href="Findings-register.csv">Findings CSV</a><a href="#materials">Participant test pack</a><a href="session.json">Scope & verification</a></nav></header>
<div class="method"><section class="panel"><h3>Fix first</h3><p>Make adaptations and dietary instructions visible. Keep bought items bought. Restore unfinished logs. Distinguish actual past meals from suggestions. Let people say who ate.</p></section><section class="panel"><h3>What worked</h3><p>Clearer opening, named school boxes, no-AI list logging, ordered-in history, an honest empty recap, reachable primary action at 360 px, Space activation and Escape dismissal.</p></section></div>
<h2 id="findings">Findings to act on</h2><p>High means substantial risk to the tested task or trustworthy meal state. Medium means meaningful effort or confusion with a workaround. These are expert priorities, not participant frequency estimates.</p>
<div class="filters" role="group" aria-label="Filter findings"><button data-filter="All" aria-pressed="true">All</button><button data-filter="High" aria-pressed="false">High</button><button data-filter="Medium" aria-pressed="false">Medium</button><label class="filter-label" for="area">Area</label><select id="area"><option value="">All areas</option>AREAS</select><input id="search" type="search" aria-label="Search findings" placeholder="Search findings"></div>
<p class="count" id="count" role="status">17 of 17 findings</p><div id="cards">CARDS</div>
<section class="panel"><h3>Design direction</h3><p>Keep one meal workspace: day + people → choice and required changes → ingredients and cook handoff → what actually happened → a saved record that can be corrected.</p><p>Recap access should live in Memory even when its home card is hidden. Home customisation should change the presentation without hiding core tasks.</p></section>
<section id="materials">PACK</section>
<footer class="footer"><p>No application source changes or deployment. No real messages, orders, personal photos or paid AI calls. Browser sizes do not certify physical phone behaviour. Full catalogue, native accessibility, offline/storage stress and multi-device security were outside this pass.</p><a href="UX-review.md">Read all findings, limits and follow-up opportunities</a></footer></main>
<script>
let chosen='All';const cards=[...document.querySelectorAll('.finding')],area=document.getElementById('area'),search=document.getElementById('search');
function filter(){let n=0;const q=search.value.trim().toLowerCase();for(const c of cards){const show=(chosen==='All'||c.dataset.priority===chosen)&&(!area.value||c.dataset.area===area.value)&&(!q||c.textContent.toLowerCase().includes(q));c.hidden=!show;if(show)n++}document.getElementById('count').textContent=n+' of '+cards.length+' findings'}
for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{chosen=b.dataset.filter;for(const x of document.querySelectorAll('[data-filter]'))x.setAttribute('aria-pressed',String(x===b));filter()});area.addEventListener('change',filter);search.addEventListener('input',filter);
</script></body></html>'''
page = page.replace('AREAS', areas).replace('CARDS', '\n'.join(cards)).replace('PACK', simple_pack(pack))
(HERE / 'Review.html').write_text(page, encoding='utf-8')
print(f'Created review, CSV and HTML: {len(findings)} findings ({high} High, {medium} Medium).')



# The original review remains a snapshot of 1.0.4; expose the later repair separately.
if (HERE / 'fixes.json').exists():
    review_path = HERE / 'Review.html'
    historical = review_path.read_text(encoding='utf-8')
    banner = '<aside class="notice" style="background:#e9f0df;border-color:#55734c"><h2>Update: all 17 issues fixed in 1.0.5.</h2><p>This page preserves the original observations. <a href="Fixes.html">Read the repairs, release checks and remaining device-test limits.</a></p></aside>'
    historical = historical.replace('<header>', banner + '<header>', 1)
    historical = historical.replace('<h2>The live URL is serving an older release.</h2>', '<h2>At review start, the live URL served an older release.</h2>')
    historical = historical.replace('No application source changes or deployment.', 'The original review made no application source changes or deployment. The later 1.0.5 repair is documented separately above.')
    review_path.write_text(historical, encoding='utf-8')
    md_path = HERE / 'UX-review.md'
    original = md_path.read_text(encoding='utf-8')
    md_path.write_text('> Update: UX01–UX17 were fixed in 1.0.5. See [repairs and verification](Fixes.md). The observations below describe the original review baseline.\n\n' + original, encoding='utf-8')
