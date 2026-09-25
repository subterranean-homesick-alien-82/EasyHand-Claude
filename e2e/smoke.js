// Read-only check that a deployed EasyHand is working. Safe to run against the live site:
// it creates no accounts and changes nothing.
// Env: WEB_URL and API_URL (required), CHROMIUM_PATH (optional).
const { chromium } = require('playwright');

const WEB_URL = process.env.WEB_URL;
const API_URL = process.env.API_URL;

function check(ok, label, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  if (!WEB_URL || !API_URL) {
    console.error('Set WEB_URL and API_URL, e.g. WEB_URL=https://easyhand.app API_URL=https://easyhand-api.onrender.com');
    process.exit(2);
  }

  try {
    const res = await fetch(`${API_URL}/health`);
    check(res.ok, 'API is up', `${API_URL}/health → ${res.status}`);
  } catch (err) {
    check(false, 'API is up', err.message);
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

  await page.goto(`${WEB_URL}/help`);
  const help = await page
    .getByText('Staying safe')
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  check(help, 'Deep links work (Help & Safety page loads directly)');

  // Calling the API from the website's own origin proves CORS_ORIGINS and EXPO_PUBLIC_API_URL line up.
  const fromSite = await page.evaluate(async (api) => {
    try {
      const r = await fetch(`${api}/posts?limit=1`);
      return { ok: r.ok, status: r.status };
    } catch (e) {
      return { ok: false, status: String(e) };
    }
  }, API_URL);
  check(fromSite.ok, 'Website is allowed to call the API (CORS)', `status ${fromSite.status}`);

  check(errors.length === 0, 'No JavaScript errors on the page', errors.join('; '));
  await browser.close();
  console.log(process.exitCode ? '\nSome checks failed.' : '\nAll checks passed.');
})();
