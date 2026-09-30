# Google Play — listing and Play Console answers

Everything to paste into Play Console for **What's Cooking: Family Meals**
(package `com.gameon1210.whatscooking`). Graphics are in this folder.

## 1. App details (Create app)

| Field | Value |
| --- | --- |
| App name | What's Cooking: Family Meals |
| Default language | English (India) – en-IN |
| App or game | App |
| Free or paid | Free (this can't be changed to paid later) |
| Category | Food & Drink |
| Tags | Meal planner, Recipes & cooking, Family |
| Contact email | whatscooking@mutations.in |
| Website | https://gameon1210.github.io/whatscooking_2/privacy.html (or leave blank) |
| Privacy policy URL | https://gameon1210.github.io/whatscooking_2/privacy.html |

## 2. Store listing

**App name (30 max)** — `What's Cooking: Family Meals`

**Short description (80 max)**
```
Decide the family's next meal in seconds — rules, tiffins, leftovers and cook.
```

**Full description (4000 max)**
```
"What should we cook today?" — answered in ten seconds, for your family.

What's Cooking learns what your household actually eats and suggests the next meal: breakfast, lunch, dinner and your children's school tiffins. It is not a recipe app. It is a daily decision helper built for Indian homes.

MADE FOR REAL FAMILIES
• Everyone's food rules, respected: vegetarian, eggetarian, Jain, no onion-garlic, allergies, spice levels
• Fasting days handled for you: Ekadashi, Navratri, weekly vrat and "no non-veg on Tuesday"
• When rules clash, you get one base meal and a separate plate — for example a vrat plate for Dadi
• Age-aware: milder for young children, lighter and softer for elders

DECIDE IN SECONDS
• One card per meal, with a plain reason: "Not made in 12 days · Aarav loved it · uses yesterday's dal"
• Swipe right to accept, left for the next idea
• Quick chips: Quick, Low energy, Use leftovers, Guests, Rainy day, Light food
• Tell it what's in the kitchen — tap the vegetables you have

PLAN TOMORROW BEFORE BED
• A 9 pm reminder with tomorrow's breakfast, two tiffins per child and lunch, confirmed in one tap
• A calm 7-day calendar with fasts, festivals and school days marked
• Pin, swap or change any meal

SEND IT TO YOUR COOK
• A Cook Card on WhatsApp in her language — Kannada, Hindi, Tamil, Telugu or English
• A 1st choice, a 2nd choice and a backup, with quantities for your headcount
• She taps what she'll make, or what's missing, and replies — no app for her to install

LEARNS AS YOU GO
• Log meals by voice in Hindi, English or Hinglish: "kal raat khichdi, aaj subah idli"
• Tiffin check after school: came back empty, half or full?
• Leftovers become tomorrow's plan: dal becomes dal paratha, rice becomes lemon rice
• Free-text preferences: "prefer healthier options", "less spicy for kids", "more millets"
• Family favourites and a full food memory

GROCERIES AND ORDERING IN
• A shopping list of only what planned meals need beyond your staples
• Open Blinkit search for any item, or share the list on WhatsApp
• Tired evening? Order-in ideas that still fit everyone's rules, opened in Zomato

PRIVATE BY DESIGN
• Your family's data stays on your phone. No account, no ads, no tracking
• Export or delete everything any time

North Indian, South Indian and pan-Indian dishes included, and you can add your own.
```

**Graphics**

| Asset | File |
| --- | --- |
| App icon 512×512 | `icon-512.png` |
| Feature graphic 1024×500 | `feature-graphic-1024x500.png` |
| Phone screenshots 1080×1920 (7) | `phone-1-today.png` … `phone-7-memory.png` |

## 3. App content (Policy → App content)

**Privacy policy** — https://gameon1210.github.io/whatscooking_2/privacy.html

**Ads** — No, the app does not contain ads.

**App access** — All functionality is available without special access (no login).

**Content rating (IARC questionnaire)**
- Category: *All other app types* (utility / productivity)
- Violence, sexuality, language, controlled substances, gambling: **No** to all
- Users can interact or exchange content with each other in the app: **No** (sharing is via WhatsApp, outside the app)
- Shares user's location with other users: **No**
- Allows purchase of digital goods: **No**
- Expected result: **Everyone / 3+**

**Target audience and content**
- Target age groups: **18 and over** only
- Appeals to children: **No** (it's a household planning tool for parents; children don't use it)

**News app** — No. **COVID-19 contact tracing** — No. **Government app** — No.
**Financial features** — None. **Health** — No health features.

**Data safety**

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data encrypted in transit? | **Yes** |
| Do you provide a way for users to request that their data is deleted? | **Yes** — in-app delete (Settings → Delete this family) and uninstall |

Data types to declare:

| Data type | Collected | Shared | Optional? | Processed ephemerally? | Purpose |
| --- | --- | --- | --- | --- | --- |
| Photos and videos → **Photos** | Yes | No | Optional | Yes | App functionality (meal recognition via Google Gemini, only when the user adds their own key) |
| Location → **Approximate location** | Yes | No | Optional (chosen city, not GPS) | Yes | App functionality (weather hint) |

Everything else the user enters (family names, food rules, meals) stays on the device and is **not** collected: Play defines "collected" as data sent off the device.

**Permissions** — Camera (take a meal photo), Notifications (plan-tomorrow, Cook Card and tiffin reminders). No sensitive permissions that need a declaration form.

## 4. Closed test (required for new personal accounts)

- Track: **Closed testing → Alpha**, name "Family testers"
- Testers: an email list of at least **12** Gmail accounts, opted in for **14 days in a row**
- Countries: India
- Release notes:
```
First test build of What's Cooking. Please use it for a few days: set up your family, plan tomorrow, log meals and tell us what felt slow or wrong. Feedback: whatscooking@mutations.in
```
- Tester invite message (send with the opt-in link from Play Console):
```
Hi! We've built a small app that helps decide the family's next meal (tiffins, leftovers, even a WhatsApp card for the cook). Google needs 14 days of testing before it goes public. Could you install it from this link and keep it for two weeks? Opt in here: <OPT-IN LINK>. Thank you!
```

After 14 days: Dashboard → **Apply for production** (questions about the test, the app and readiness).
