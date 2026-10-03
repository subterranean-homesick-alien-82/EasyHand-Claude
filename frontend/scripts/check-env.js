// Runs before every web build. Stops the build with a plain explanation if EXPO_PUBLIC_API_URL
// isn't a usable address, instead of shipping a site that quietly sends logins to the wrong place.
// (A value like "[https://x.onrender.com](https://x.onrender.com)" once did exactly that.)

const raw = process.env.EXPO_PUBLIC_API_URL;
// Vercel sets VERCEL=1 on its build machines; set REQUIRE_API_URL=1 to enforce the same checks elsewhere.
const deploying = process.env.VERCEL === '1' || process.env.REQUIRE_API_URL === '1';

function fail(problem) {
  console.error(`
EasyHand build stopped: EXPO_PUBLIC_API_URL ${problem}

  Current value: ${raw === undefined ? '(not set)' : JSON.stringify(raw)}

  It must be your backend's address and nothing else, for example:
    https://easyhand-api.onrender.com

  Fix it in Vercel: Project, then Settings, then Environment Variables. Clear the value box and type
  the address by hand (pasting from a chat can add brackets or spaces). Then redeploy.
`);
  process.exit(1);
}

if (raw === undefined || raw.trim() === '') {
  if (deploying) fail('is not set.');
  console.log('EXPO_PUBLIC_API_URL not set; the app will use http://localhost:8000 (fine for local development).');
  process.exit(0);
}

if (raw !== raw.trim()) fail('has spaces at the start or end.');

let url;
try {
  url = new URL(raw);
} catch {
  fail('is not a web address.');
}

if (!/^https?:\/\/[^/]/.test(raw)) fail('must start with https://');
if (/[\s[\]()<>"'`]/.test(raw)) fail('contains characters that do not belong in a web address (brackets, quotes or spaces).');
if (url.search || url.hash || url.username) fail('should not contain ?, # or a username.');
if (url.pathname !== '/' && url.pathname !== '') fail(`should be just the address, without a path (remove "${url.pathname}").`);
if (deploying && url.protocol !== 'https:') fail('must start with https:// on the live site (browsers block http:// from a secure page).');

console.log(`EXPO_PUBLIC_API_URL looks good: ${url.origin}`);
