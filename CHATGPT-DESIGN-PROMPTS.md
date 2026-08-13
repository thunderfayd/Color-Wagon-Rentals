# ChatGPT design prompts: Color Wagon Rentals

Two prompts, paste each into ChatGPT as its own conversation. Attach screenshots
of the current pages where noted. Every fact below is client-confirmed by Heidi
in her June 2026 email, so none of it should be invented or "improved."

Hard rules that appear in both prompts, because they are the ones that get
ignored: **no emojis anywhere**, **no em dashes anywhere**, **no testimonials or
reviews of any kind**.

---

## Prompt 1: the public site

> I need you to redesign the public website for a small camper van rental
> business. Give me the full design direction plus production-ready HTML and CSS.
> I am attaching screenshots of the current site.
>
> **The business.** Color Wagon Rentals, Manitowoc, Wisconsin. Owned by Heidi and
> Will. Started in 2026, so it is genuinely new. They rent two hand-painted
> camper vans and one trailer. Everything is hand-painted by them, and that is
> the entire point of the brand: these are not white fleet vans, they are murals
> you drive.
>
> **What they rent, exactly:**
> - **Gertrude**: 2008 Ford Econoline. Autumn and woodland mural. Bluetooth
>   radio. Sleeps 2 on a queen bed. Rear-access kitchen, pull-out propane stove,
>   sink with a 5 gallon water tank, refrigerator, bedding and linens, privacy
>   curtains, two camping chairs.
> - **Violet**: 2013 Ford Econoline. Purple pond-life mural with frogs. CD
>   player. Has solar power on board. Sleeps 2 on a queen bed. Same kitchen setup
>   as Gertrude.
> - **The Trailer**: sleeps 6. Full bathroom with shower and toilet, kitchen with
>   stove, microwave and fridge, dinette. Delivery only, within 30 miles of
>   Crivitz WI, and they deliver, set up and break down. Price is by quote, not
>   listed.
>
> **Pricing, exactly:** $99 per night. $650 per week. 700 miles per week
> included, $0.45 per mile after that. $50 cleaning and prep fee. Wisconsin sales
> tax of 5.5% on top. A deposit confirms the booking and the balance is due 7
> days before the trip starts, not at pickup. Renters must be 25 or older with a
> valid license. No special license needed, it drives like a regular van.
>
> **Things you must never write, because they are false:**
> - Do not say the solar runs the refrigerator. Violet has solar, but the fridge
>   is not wired to it. Say "solar power on board" and nothing more.
> - Do not give Gertrude solar. Only Violet has it.
> - Do not say the business was established before 2026.
> - Do not invent reviews, testimonials, star ratings, "loved by 200 families,"
>   or any social proof. The business is brand new and fabricated proof is a
>   legal liability. If the layout wants a trust section, use real facts instead:
>   what is included, what the policies are, who Heidi and Will are.
>
> **What is wrong with the current design, and what I want fixed:**
> 1. The hero photo buries the product. The most prominent object in it is a
>    car ferry, and the vans are cropped small and sit behind the text. The
>    murals are the entire value proposition and right now you can barely see
>    them. The hero should make a mural the subject.
> 2. A heavy dark overlay sits on the hero to make white text readable, which
>    mutes the exact colors that sell the van. Solve legibility without draining
>    the photo: a text panel, a gradient scrim on one side only, or type placed
>    over a genuinely quiet part of the image.
> 3. The headline wraps badly and orphans a word onto its own line.
> 4. The page leans on decorative icons to create visual interest instead of
>    layout, type and photography. I have stripped every one of them out. Do not
>    put them back. Build the hierarchy with scale, spacing and real photos.
> 5. A stat band shows "~16 MPG" as a headline number. That is a weak number for
>    a camper van and it invites the wrong comparison. Replace that slot with
>    something that actually sells: sleeps 2, 700 miles a week included, or the
>    fact that the vans are hand-painted originals.
>
> **Keep these, they are working:** the warm cream and forest green palette, the
> serif display face paired with a rounded body face, the accent script used
> sparingly, the rounded card shapes.
>
> **Current design tokens**, keep or deliberately evolve them, tell me which:
> cream #FFF9EF, cream-dark #F0E7D3, ink #20312A, green #1E7A46, green-dark
> #145A33, gold #FFB703, Gertrude orange #C2700E, Violet purple #7C3AED.
> Fonts: Fraunces (display serif), Nunito (body), Caveat (script accent).
>
> **Pages:** home, fleet (all three units plus policies), booking (a 6 step flow:
> pick the van, pick dates, your details, agreement checkboxes, e-signature,
> confirmation), and a 404.
>
> **Constraints:** static HTML, CSS and vanilla JavaScript, no framework and no
> build step. Must work on mobile first. Self-contained CSS, no CDN or icon font.
> If you want icons, draw them as inline SVG.
>
> **Deliver:** the design rationale first, in plain language, then the full HTML
> and CSS for the home page, then the fleet and booking pages. Show me the mobile
> layout as well as desktop.

---

## Prompt 2: the admin dashboard

Attach a screenshot of the current `/admin.html`.

> I need you to redesign the admin dashboard for a small camper van rental
> business. This is the screen the owner runs her entire business from, on a
> phone, usually while doing something else. She is not technical. Design for
> that person, not for a SaaS product tour.
>
> **Who uses it:** Heidi, the owner. One user. She is not going to learn an
> interface. Every screen has to be obvious at a glance and every action has to
> say what it will do in plain words before she taps it.
>
> **What the dashboard actually does today:**
> 1. **New booking requests.** Someone submits the form on the website and it
>    lands here with their name, dates, number of nights, group size, driver
>    license state and number, destination, special requests, and whether they
>    have signed the rental agreement. She either confirms it, which blocks those
>    dates on the public calendar instantly, or declines it, which does not block
>    anything.
> 2. **Booked and blocked dates.** The live calendar. She can also add a booking
>    or block dates manually, for maintenance or personal use.
> 3. **Site traffic.** Self-hosted pageview analytics, last 14 days. No cookies,
>    no IP addresses, no personal data.
> 4. **A launch checklist.** Each item has a status of done, to do, or confirm,
>    and expands to explain what she needs to do in her own words. This is how
>    she knows what is still unfinished. Current items: website deployed, custom
>    domain, dashboard password, SignWell e-signature setup, Stripe payment and
>    deposit collection, confirm the Wisconsin sales tax rate, set www as the
>    primary domain.
>
> **The problems to solve:**
> 1. It reads as a wall of equally weighted panels. Nothing tells her what needs
>    her attention right now. A pending booking request is urgent and a traffic
>    chart is not, but they currently look the same.
> 2. It relied on emoji to differentiate sections. I have removed all of them.
>    Do not reintroduce them. Use hierarchy, spacing, weight and color instead,
>    or inline SVG if an icon genuinely helps.
> 3. Confirm and decline are destructive and irreversible from her point of view,
>    and they sit right next to each other with no confirmation step.
> 4. The launch checklist is the most useful thing on the page for her right now
>    and it is buried below everything else.
>
> **What I want:** the dashboard should open on a single clear answer to "is
> there anything I need to do?" If there is a pending request, that is the whole
> top of the screen. If there is not, the screen should say so plainly rather
> than showing an empty panel. Everything else is secondary and should look it.
>
> **Constraints:** static HTML, CSS and vanilla JavaScript in a single file, no
> framework, no build step, no CDN. It is password protected and served from
> Netlify. It must be genuinely usable on a phone, one-handed. Match the public
> site's palette: cream #FFF9EF, ink #20312A, green #1E7A46, gold #FFB703.
>
> **Rules:** no emojis anywhere. No em dashes anywhere, use colons, commas or
> parentheses. Every button says what it does, so "Confirm and block these
> dates," not "Confirm." Anything irreversible asks once before doing it.
>
> **Deliver:** the layout rationale first, then the full HTML, CSS and
> JavaScript. Show me the mobile layout and the empty state, the one where there
> are no pending requests, because that is what she will see most days.

---

## What I already changed, so ChatGPT starts from a clean base

- Removed **169 emoji** across the site: 23 literal characters and 146 that were
  hidden as HTML entities like `&#10024;`, which is why earlier passes missed
  them.
- Replaced the checkmark glyph in feature and policy lists with a CSS-drawn tick,
  so 38 list markers no longer depend on a font shipping U+2713 or on a device
  rendering it as a color emoji.
- Removed the remaining em dashes, including 6 that survived the July pass as
  `&mdash;` entities in the admin dashboard and the owner guide.
- Replaced decorative arrows with plain words or ASCII, so date ranges now read
  "Aug 3 to Aug 9" and setup instructions read "Netlify > Domain management."
- **Fixed a factual claim in 4 places:** the site said Violet's solar power keeps
  the refrigerator running off-grid. Heidi corrected this in June: the fridge is
  not wired to the solar. It now says "solar power on board."
