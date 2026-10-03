// Read-only check that a deployed EasyHand is working. Safe to run against the live site:
// it creates no accounts and changes nothing.
// Env: WEB_URL (required); API_URL (optional: the backend address you expect. If given, the check
// fails when the website was built with a different one); CHROMIUM_PATH (optional).
const { chromium } = require('playwright');

const WEB_URL = process.env.WEB_URL;
const EXPECTED_API_URL = process.env.API_URL?.replace(/\/+$/, '');

function check(ok, label, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  if (!WEB_URL) {
    console.error('Set WEB_URL, e.g. WEB_URL=https://geteasyhand.com npm run smoke');
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(WEB_URL);
  const welcome = await page
    .getByText('How it works')
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  check(welcome, 'Website shows the welcome screen');

  // The backend address is baked into the website when it is built (EXPO_PUBLIC_API_URL in Vercel).
  // Test the address the site really uses, not one typed here, so a bad Vercel value is caught.
  const apiUrl = await page.evaluate(() => window.__EASYHAND_API_URL__);
  const absolute = typeof apiUrl === 'string' && /^https?:\/\/[^/\s]+$/.test(apiUrl);
  check(absolute, 'Website has a proper backend address', String(apiUrl));
  if (EXPECTED_API_URL) {
    check(apiUrl === EXPECTED_API_URL, 'Website uses the backend you expected', `site: ${apiUrl}, expected: ${EXPECTED_API_URL}`);
  }
  if (absolute && WEB_URL.startsWith('https://')) {
    check(apiUrl.startsWith('https://'), 'Backend address uses https://', apiUrl);
  }

  if (absolute) {
    try {
      const res = await fetch(`${apiUrl}/health`);
      check(res.ok, 'Backend is up', `${apiUrl}/health → ${res.status}`);
    } catch (err) {
      check(false, 'Backend is up', `${apiUrl}/health: ${err.message}`);
    }

    // Calling the backend from the website's own page proves CORS_ORIGINS on Render includes this site.
    const fromSite = await page.evaluate(async (api) => {
      try {
        const r = await fetch(`${api}/posts?limit=1`);
        return { ok: r.ok, status: r.status };
      } catch (e) {
        return { ok: false, status: String(e) };
      }
    }, apiUrl);
    check(
      fromSite.ok,
      'Website is allowed to call the backend (CORS_ORIGINS on Render)',
      fromSite.ok ? `status ${fromSite.status}` : `${fromSite.status}. Add ${new URL(WEB_URL).origin} to CORS_ORIGINS`,
    );
  }

  await page.goto(`${WEB_URL.replace(/\/+$/, '')}/help`);
  const help = await page
    .getByText('Staying safe')
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  check(help, 'Deep links work (Help & Safety page loads directly)');

  check(errors.length === 0, 'No JavaScript errors on the page', errors.join('; '));
  await browser.close();
  console.log(process.exitCode ? '\nSome checks failed.' : '\nAll checks passed.');
})();
