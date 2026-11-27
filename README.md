# Acme 1-2-3 — business website

A static website (plain HTML, CSS and vanilla JavaScript) hosted on Cloudflare Pages.
There is no build step. The contact form is handled by a Cloudflare Pages Function
(`functions/api/contact.js`) that emails each inquiry to the business owner through
[Resend](https://resend.com).

| File | Purpose |
|---|---|
| `index.html` | All page content: business name, services, contact details |
| `styles.css` | Styles, colors, light/dark themes |
| `script.js` | Theme toggle, menu, smooth scrolling, form validation and sending |
| `functions/api/contact.js` | Receives the form and sends the email (no site-specific code) |

## Cloudflare Pages project settings

- Production branch: `main`
- Framework preset: None
- Build command: *(leave empty)*
- Build output directory: `/`

## Contact form setup

### Once, for your business

1. Create a free account at resend.com and create an **API key** (sending access is enough).
2. Choose how forms send email. You can use both, site by site:
   - **The client's own domain** (most professional): emails come from e.g. `forms@acme123.com`.
     Verify each client domain in Resend (**Domains → Add domain**), then add the DNS records it
     shows wherever that domain's DNS is managed.
   - **A neutral sender domain** for clients without a domain: buy one unbranded domain
     (e.g. `site-inquiries.net`), verify it in Resend once, and reuse it for every such client.

### For each client site

In the Cloudflare Pages project: **Settings → Variables and Secrets**, add these for
**Production**, then redeploy (Deployments → latest → Retry deployment).

| Name | Type | Example | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | **Secret** | `re_…` | Your Resend API key |
| `CONTACT_TO` | Text | `owner@acme123.com` | Where inquiries go; comma-separate for several |
| `SITE_NAME` | Text | `Acme 1-2-3` | Used in the subject and sender name |
| `FROM_EMAIL` | Text | `forms@acme123.com` | Must be on a domain verified in Resend |
| `FROM_NAME` | Text | `Acme 1-2-3 Website` | Optional; defaults to "`SITE_NAME` Website" |

The owner receives an email from **"Acme 1-2-3 Website" &lt;forms@acme123.com&gt;** with the
subject *New inquiry from Jane Doe (Acme 1-2-3 website)*. Pressing Reply answers the customer.
The client never has to activate or set up anything.

**Testing before a domain is verified:** leave `FROM_EMAIL` unset. Resend's test sender
(`onboarding@resend.dev`) is used, but it only delivers to the email address of the Resend
account owner, so set `CONTACT_TO` to that address while testing.

### Checking that it works

Submit the form on the live site. The visitor sees a "Thanks" confirmation and the email
arrives within a minute. If the visitor sees an error instead, check the function's logs in
Cloudflare (the Pages project → the deployment → **Functions** / real-time logs) and the
**Logs** page in Resend. A missing `RESEND_API_KEY` or `CONTACT_TO` is logged as
"Contact form is not configured".

## New client site checklist

1. Copy this repository for the client and connect it to a new Cloudflare Pages project.
2. In `index.html`, replace the business name, tagline, services, about text and contact details.
3. Add the Cloudflare variables above and redeploy.
4. Send a test inquiry.
