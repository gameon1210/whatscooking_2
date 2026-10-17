import csv, json, html, re
from pathlib import Path
from collections import Counter

here = Path(__file__).resolve().parent
root = here.parent.parent
findings = json.loads((here/'findings.json').read_text(encoding='utf-8'))
requirements = json.loads((here/'requirements.json').read_text(encoding='utf-8'))
assessment = json.loads((here/'requirement-assessment.json').read_text(encoding='utf-8'))
session = json.loads((here/'test-session.json').read_text(encoding='utf-8'))
results = json.loads((here/'audit-results.json').read_text(encoding='utf-8'))
perf = json.loads((here/'performance-results.json').read_text(encoding='utf-8'))
assert len(findings) == 44 and len(requirements) == len(assessment) == 55
assert set(x[0] for x in requirements) == set(assessment)
assert len({f['id'] for f in findings}) == 44
counts = Counter(f['severity'] for f in findings)
status_counts = Counter(a[0] for a in assessment.values())
for f in findings:
    source = root / f['file']
    lines = source.read_text(encoding='utf-8').splitlines()
    f['line'] = next((i+1 for i,l in enumerate(lines) if f['marker'] in l), 1)
    f['sourceLink'] = source.as_posix() + ':' + str(f['line'])
    f['tests'] = [t['fullName'] for s in results['testResults'] for t in s['assertionResults'] if re.match(r'\b'+f['id']+r'\b', t['title'])]
(here/'findings-with-evidence.json').write_text(json.dumps(findings, ensure_ascii=False, indent=2),encoding='utf-8')
with (here/'defect-register.csv').open('w',encoding='utf-8-sig',newline='') as out:
    fields=['id','severity','title','fr','evidence','steps','expected','actual','fix','sourceLink']
    writer=csv.DictWriter(out,fieldnames=fields,extrasaction='ignore');writer.writeheader();writer.writerows(findings)
matrix=[]
for rid,priority,requirement in requirements:
    status,note=assessment[rid]
    ids=[f['id'] for f in findings if rid in f['fr']]
    matrix.append({'id':rid,'priority':priority,'status':status,'requirement':requirement,'assessment':note,'defects':', '.join(ids)})
with (here/'fsd-traceability.csv').open('w',encoding='utf-8-sig',newline='') as out:
    writer=csv.DictWriter(out,fieldnames=list(matrix[0]));writer.writeheader();writer.writerows(matrix)

md=['# What’s Cooking 2.0 — QA report',
'3 October 2026 · Asia/Calcutta · app 1.0.0 · commit '+session['baselineCommit'],
'',
'## Release assessment',
'**Not ready for public release against the attached FSD.** The app compiles and its original tests pass, but dietary safety and key household/cook workflows fail. The three Critical findings are allergy enforcement (D01), unsafe custom-dish classification (D03), and hard-rule bypass through manual planning (D05).',
'',
f'**44 findings:** {counts["Critical"]} Critical, {counts["High"]} High, {counts["Medium"]} Medium. Of these, 36 finding groups have executable failing regression evidence; D35–D42 are evidenced by browser interaction and/or source review, with native follow-up clearly labelled. A failed assertion count is not the number of unique defects.',
'',
'## Test results and limits',
'| Check | Result |',
'|---|---|',
'| Existing automated tests | 25/25 passed; two suites |',
f'| New targeted audit checks | {results["numTotalTests"]} executed: {results["numPassedTests"]} passed, {results["numFailedTests"]} failed; no skipped tests |',
'| TypeScript check / lint | Both passed |',
'| Expo dependency/configuration diagnosis | 21/21 passed |',
'| Production bundle exports | Android, iOS and web passed; this does not certify native installation/runtime |',
f'| Desktop ranking benchmark | 1,095 historical meals; 30 measured runs; median {perf["medianMs"]:.1f} ms, p95 {perf["p95Ms"]:.1f} ms, max {perf["maxMs"]:.1f} ms |',
'| Public Cook and privacy pages | HTTP HEAD returned 200 for both default URLs |',
'| Functional requirement inventory | 55 IDs: 34 Must, 16 Should, 5 Could |',
'',
'The added tests assert the expected FSD behavior and intentionally remain failing until fixes are made. There are now 80 checks across the existing and audit suites, with 41 passing and 39 failing. They are not a statistical estimate of product-wide reliability: the new suite deliberately targets high-risk boundaries.',
'',
'Browser testing used synthetic data in a local preview, including a 390 × 844 mobile viewport. Native notifications were tested through mocked scheduling calls, not actual device delivery. The attached AAB was located but not installed: no Android device/emulator/adb or iOS runtime was available in this workspace. Camera, speech, native sharing, background execution and actual messaging still require physical-device tests. The desktop benchmark does not prove the mobile <300 ms target or cached Today render <1 s.',
'',
'The FSD was treated as a requirements reference, not as permission to publish, message contacts, spend money or perform legal/compliance actions. No real messages, purchases, family deletion or paid Gemini calls were made. Existing changes in app/app.json and app/package-lock.json were preserved. Application source was not changed; the audit files are under artifacts/qa.',
'',
'Existing document/testing skills and browser capabilities were sufficient. Expo Doctor was invoked through the standard npm registry; no additional skill/plugin installation was necessary.',
'',
'## What worked in the tested paths',
'- Onboarding with a child, saved milk allergy and ten frequent dishes reached Today and persisted after reload.',
'- English/Hinglish multi-day meal notes produced separate yesterday/today drafts and saved into date-grouped Memory.',
'- Manual lunch/dinner logging offered leftover capture; per-member reactions, history search and member filters worked.',
'- Exact peanut exclusions, ordinary vegetarian/Jain rules, pure school-holiday filtering and initial tiffin-primary distinctness passed controls.',
'- Pure auto-log ran once per due plan, created pending confirmation entries and allowed manual replacement.',
'- Cook page rendered Hindi headings, allowed a ranked selection and missing-item text; valid manual reply parsing merged grocery items.',
'- Weather failures returned a safe fallback; mocked rain/cold context and denied-notification-permission handling passed.',
'',
'## Recommended repair order',
'1. **Dietary safety:** fix D01–D05 and D14 together around a complete canonical dish/ingredient/allergen model. Enforce safety at all plan mutation boundaries, including swap and custom dish creation. Recheck saved plans when family rules change.',
'2. **Meal integrity and cook identity:** fix D06–D10, D22–D24, D34–D42. Preserve selected options, plate membership and portions; authenticate/expire links; distinguish opening a composer from sending/delivery.',
'3. **Reminder/auto-log reliability:** fix D26 and D28–D33/D37. Preserve reminders per family, account for holidays/box settings, reconcile at slot end and implement the exception digest.',
'4. **Learning and convenience:** fix leftover inference, negation, novelty and feedback scope (D11–D19, D43–D44); complete editing controls and shopping logic.',
'5. **FSD completion and real-device gate:** implement the missing Must portions first—shared family/invites, member-owned consent, complete Indic voice, audio attachment, complete calendar and cook handoff—then perform Android/iOS closed-beta testing. The Should/Could items remain visible in the matrix rather than being silently reclassified as launch blockers.',
'',
'## FSD gaps beyond individual defects',
'| Gap | Requirement / scope |',
'|---|---|',
'| Shared family, sign-in and invite acceptance | FR-216; no Auth/backend/cloud sync or signed expiring invites. Multiple families exist only on one device. |',
'| Member-owned consent | FR-292; planner checkbox replaces self opt-in link. Cook STOP requires manual planner paste. This is a specification gap, not a legal compliance opinion. |',
'| Full voice-first workflow | FR-220/231; keyboard dictation substitutes for app recognition; TTS plays locally instead of creating attached audio. |',
'| Editable food/school calendars | FR-212/265; no user editing of bundled fast dates/holidays, and missing Pradosh/Ramzan/Shravan. |',
'| Standing menu bank and full cook loop | FR-233/236; no automatic response ingestion, shopper ping or fallback bank for unplanned days. |',
'| Natural-language ask / widget | FR-204/207; absent. |',
'| Family vote / picture-card kid mode | FR-240/241; absent. |',
'| Incoming WhatsApp photo proof | FR-223; absent. |',
'| Occasion memory and life modes | FR-262/263; no guest groups, five-course menus, event rules, preparation timeline, Served record or date-range modes. |',
'| Calendar grid/drag/image sharing | FR-261; implemented as a day list with tap swaps and text sharing. |',
'| Balance rings / festival packs / food-saved counter | FR-271/264/254; absent. |',
'| Heirloom recordings / shareable recaps | FR-282/283; absent. |',
'| Full launch localisation | FSD §9; main UI remains English; cook headings cover five languages, dish/quantity text remains English. Marathi/Bengali absent. |',
'| Offline sync/queued messaging | FSD §9; local decide/log/history exist, but no cloud reconciliation, offline message queue or conflict handling. |',
'| Server-side AI key, caching, spend cap | FSD §9; native key uses SecureStore and web key uses AsyncStorage; requests go directly to Gemini, with no server ownership, caching, family budget or robust timeout/retry layer. |',
'| Remote ranking config, crash/metric instrumentation | FSD §8–10; weights are source constants; no Remote Config/Crashlytics or shown/accepted denominator instrumentation. |',
'| Architecture decision drift | FSD specifies Kotlin Multiplatform/Room/Ktor/Supabase; repository implements Expo/React Native/Zustand/AsyncStorage. Record an approved architecture revision separately from functional defects. |',
'',
'The [app README]('+str(root/'app/README.md').replace('\\','/')+') says every Must requirement is implemented, but its own deferred-sync section and the matrix contradict that claim. “Implemented foundation” below means the mechanism exists and basic controls were exercised; it is not native release certification. “Partial” may be a missing subfeature, a defect, or a pending platform integration check. “Absent” is reserved for requirements with no implementation found.',
'',
'## Prioritised defect register',
'| ID | Severity | Finding | Evidence |',
'|---|---|---|---|']
for f in findings:
    md.append(f'| [{f["id"]}](#{f["id"].lower()}) | {f["severity"]} | {f["title"]} | {f["evidence"]} |')
for f in findings:
    md.extend(['',f'### {f["id"]} — {f["title"]}',
      f'**{f["severity"]} · {f["fr"]} · {f["evidence"]}**',
      '',f'**Reproduce:** {f["steps"]}',
      '',f'**Actual:** {f["actual"]}',
      '',f'**Expected:** {f["expected"]}',
      '',f'**Suggested repair:** {f["fix"]}',
      '',f'**Source:** [{f["file"]}:{f["line"]}]({f["sourceLink"]})'])
    if f['tests']:md.extend(['','**Executable evidence:** '+ '; '.join('`'+t+'`' for t in f['tests'])+'.'])
    if f.get('screenshot'):md.extend(['',f'![{f["id"]} browser evidence]({(here/f["screenshot"]).as_posix()})'])
md.extend(['','## Complete FSD traceability',f'Assessment counts: '+', '.join(f'{v} {k}' for k,v in status_counts.items())+'.','',
'| ID | Priority | Status | Assessment / related defects |','|---|---|---|---|'])
for m in matrix:
    md.append(f'| {m["id"]} | {m["priority"]} | {m["status"]} | {m["assessment"]} |')
md.extend(['','## Remaining verification before release',
'- Install an Android preview APK or AAB-derived APK set and an iOS build; verify fresh install, upgrade, storage migration, restart and device-time/timezone changes.',
'- Run camera/gallery permission-denied and revoked-permission flows, large/corrupt images, photo preservation and family/meal/media deletion.',
'- Test Hindi/English/Kannada/Tamil/Telugu/Marathi/Bengali dictation and mixed clauses, mic denial/interruption and measured voice p90.',
'- Validate notification delivery with the app foregrounded, backgrounded and terminated, device restart, multiple families, school holidays and scheduled cook leave; verify cold-start route and pending digest.',
'- Exercise actual WhatsApp compose/cancel/send/return, installed/not-installed behavior, correct international destination and audio attachment. Verify Blinkit/Zomato links with real app versions without ordering.',
'- Test Gemini with approved test key/data: correct recognition, invalid response shapes, timeouts, 429/5xx, network interruption, caching and cost enforcement. No live key was used here.',
'- Confirm downloaded JSON and CSV contents and safe formula handling on opening CSV; no export download was captured by the browser tool during this run. A timeout alone is not reported as an app defect.',
'- Audit TalkBack/VoiceOver focus, names/roles, all 48dp hit targets, large text, dark mode, low-literacy voice path and offline cold start.',
'- After a backend exists, test signed-link tampering/expiry/replay, membership authorization, multi-user updates, sync conflicts, consent revocation and server/media deletion.',
'- Measure Today load (<1s), mobile chip rerank (<300ms), voice p90 (<3s), Tomorrow decision (<15s) and Cook delivery reliability on the specified dogfood/closed-beta group. No adoption/retention/reliability target is certified by this audit.',
'','## Repeat the audit',
'Run from the repository root:',
'','```powershell',
'node app/node_modules/jest/bin/jest.js --config artifacts/qa/jest.config.cjs --runInBand --json --outputFile artifacts/qa/audit-results.json',
'```','',
'Exit status is expected to be non-zero until reproduced defects are repaired. The test files are independent of the application test configuration. Fixture dates are fixed; notification tests mock native APIs. Source-only/device-pending findings need separate device scenarios, not a passing unit test alone.',
'',
'Evidence files: [machine-readable results]('+(here/'audit-results.json').as_posix()+'), [defect CSV]('+(here/'defect-register.csv').as_posix()+'), [FSD matrix CSV]('+(here/'fsd-traceability.csv').as_posix()+'), [session and limitations]('+(here/'test-session.json').as_posix()+').',
'',
'Expo API/version context was checked against [official SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/). That reference specifies Node 22.13.x minimum; the project README recommends Node 20+, which should be corrected. This environment used Node 24.16.0, so that README mismatch did not block this run.'
])
(here/'QA-report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')

e=html.escape
cards=[]
for f in findings:
    pic = f'<a href="{e(f["screenshot"])}"><img loading="lazy" alt="{e(f["id"])} evidence" src="{e(f["screenshot"])}"></a>' if f.get('screenshot') else ''
    detail=''.join(f'<p><strong>{label}</strong> {e(f[key])}</p>' for label,key in [('Reproduce:','steps'),('Actual:','actual'),('Expected:','expected'),('Repair:','fix')])
    cards.append(f'<details class="issue" data-severity="{e(f["severity"])}"><summary><span class="badge {f["severity"].lower()}">{e(f["severity"])}</span><span><b>{f["id"]}</b> {e(f["title"])}</span></summary><div class="inside"><p class="meta">{e(f["fr"])} · {e(f["evidence"])}</p>{detail}<p class="meta">Source: {e(f["file"])}:{f["line"]}</p>{pic}</div></details>')
table=''.join(f'<tr><td><b>{e(m["id"])}</b></td><td>{m["priority"]}</td><td>{e(m["status"])}</td><td>{e(m["assessment"])}</td></tr>' for m in matrix)
page=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>What's Cooking QA Review</title>
<style>:root{{font-family:system-ui,sans-serif;color:#242c38;background:#f6f7fa}}body{{margin:0}}main{{max-width:1100px;margin:auto;padding:36px 22px}}h1{{font-size:38px;letter-spacing:-1px;margin:8px 0}}.meta{{color:#616b79;font-size:14px}}.intro{{border-left:5px solid #ac2839;background:#fff0f0;padding:20px;border-radius:8px;line-height:1.6}}.stats{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:22px 0}}.stat{{background:white;padding:20px;border-radius:12px;border:1px solid #dfe3eb}}.stat b{{display:block;font-size:30px}}nav{{display:flex;flex-wrap:wrap;gap:18px;margin:20px 0}}a{{color:#2958a3}}.filters{{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}}input,select{{font:inherit;padding:12px;border:1px solid #bac4d1;border-radius:8px;min-height:48px;box-sizing:border-box}}input{{flex:1;min-width:180px}}.issue{{margin:10px 0;border:1px solid #dfe3eb;border-radius:10px;background:#fff}}summary{{cursor:pointer;padding:16px;display:flex;align-items:center;gap:14px;line-height:1.5}}.badge{{font-size:12px;padding:5px 9px;border-radius:6px;min-width:55px;text-align:center;font-weight:700}}.critical{{background:#f8d6dc;color:#862039}}.high{{background:#ffe5c8;color:#8e4910}}.medium{{background:#e4ebf8;color:#305888}}.inside{{padding:0 20px 20px;line-height:1.65}}img{{max-width:min(100%,640px);max-height:650px;object-fit:contain;border:1px solid #dfe3eb;border-radius:8px}}table{{border-collapse:collapse;width:100%;font-size:14px;background:white}}td,th{{border:1px solid #dfe3eb;padding:12px;text-align:left;vertical-align:top}}th{{background:#e9edf4}}.scroll{{overflow:auto}}.note{{background:#edf1f6;padding:18px;border-radius:8px;line-height:1.6}}section{{margin-top:36px}}button{{font:inherit;border:1px solid #bac4d1;background:white;border-radius:8px;padding:12px;min-height:48px;cursor:pointer}}@media(max-width:650px){{h1{{font-size:29px}}.stats{{grid-template-columns:repeat(2,1fr)}}summary{{align-items:flex-start}}}}@media print{{.filters,nav,button{{display:none}}details .inside{{display:block}}}}</style>
<main><p class="meta">3 October 2026 · app 1.0.0 · FSD review + functional testing</p><h1>What's Cooking 2.0 — QA Review</h1>
<p class="intro"><b>Release assessment: not ready for public release against the FSD.</b><br>Three critical dietary-safety failures: missed allergens, unsafe custom dish metadata and manual planning that bypasses rules. Successful compilation does not establish correct meal decisions.</p>
<div class="stats"><div class="stat"><b>44</b>findings · {counts['Critical']} critical</div><div class="stat"><b>39 / 55</b>new checks reproduce defects</div><div class="stat"><b>25 / 25</b>original tests pass</div><div class="stat"><b>55</b>FSD requirements mapped</div></div>
<nav><a href="QA-report.md">Detailed report</a><a href="defect-register.csv">Defect register CSV</a><a href="fsd-traceability.csv">FSD matrix CSV</a><a href="audit-results.json">Raw test results</a></nav>
<p class="note"><b>Evidence scope:</b> 36 finding groups have executable failing checks. Eight more are supported by browser and/or source review, with device-dependent consequences labelled. Android, iOS and web bundles compile; typecheck, lint and all 21 dependency checks pass. Responsive browser testing and mocked notification scheduling were performed. <b>Physical Android/iOS, camera, native voice, background delivery, actual WhatsApp/commerce handoff and a live Gemini key remain unverified.</b></p>
<section><h2>Prioritised findings</h2><p>Expand a finding for steps, actual vs expected behavior, repair guidance and evidence.</p><div class="filters"><input id="search" aria-label="Search findings" placeholder="Search by issue, requirement or behavior"><select id="severity" aria-label="Filter severity"><option value="">All severities</option><option>Critical</option><option>High</option><option>Medium</option></select><button id="expand">Expand visible findings</button></div><p id="visible" class="meta">44 findings shown</p>{''.join(cards)}</section>
<section><h2>Complete FSD coverage</h2><p>34 Must · 16 Should · 5 Could. “Implemented foundation” records an existing mechanism, not release certification. Partial items include incomplete features, defects or unverified platform integrations. Missing items retain their FSD priority.</p><div class="scroll"><table><thead><tr><th>ID</th><th>Priority</th><th>Assessment</th><th>Evidence and gaps</th></tr></thead><tbody>{table}</tbody></table></div></section>
<section><h2>Repair sequence</h2><ol><li>Complete ingredient/allergen metadata and enforce hard rules in every planning path.</li><li>Preserve selected dishes, all plate members and correct portions; validate cook links and replies.</li><li>Repair family-specific reminders, holiday filtering, slot-end auto-log and the 9pm digest.</li><li>Correct preference negation, novelty limits, feedback scope and leftover/shopping inference.</li><li>Implement missing Must workflows and complete the Android/iOS closed-beta gate.</li></ol><p class="note">The audit changed no application source. Synthetic test data was used; no real messages, purchases, paid recognition calls or family deletions were made. The detailed report records outstanding device scenarios and repeatable test commands.</p></section></main>
<script>const issues=[...document.querySelectorAll('.issue')];function filter(){{const q=document.getElementById('search').value.toLowerCase();const s=document.getElementById('severity').value;let n=0;for(const x of issues){{x.hidden=!!((s&&x.dataset.severity!==s)||(q&&!x.textContent.toLowerCase().includes(q)));if(!x.hidden)n++}}document.getElementById('visible').textContent=n+' findings shown'}}document.getElementById('search').addEventListener('input',filter);document.getElementById('severity').addEventListener('change',filter);document.getElementById('expand').addEventListener('click',()=>{{for(const x of issues)if(!x.hidden)x.open=true}});</script></html>'''
(here/'QA-review.html').write_text(page,encoding='utf-8')
print(json.dumps({'findings':dict(counts),'requirements':dict(status_counts),'tests':{'total':results['numTotalTests'],'passed':results['numPassedTests'],'failed':results['numFailedTests']},'report':str(here/'QA-report.md')},indent=2))
