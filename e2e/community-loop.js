const fs = require('fs');
const { chromium } = require('playwright');
// Browser test of the core loop against a running API + web build. See README "Testing".
// Env: WEB_URL (default http://localhost:8081), API_URL (default http://localhost:8000),
//      ADMIN_EMAIL / ADMIN_PASSWORD (must be in the API's ADMIN_EMAILS; default admin@example.com),
//      EMAIL_LOG (API server log file; enables the password-reset steps, which read the link from it),
//      SHOTS (dir for screenshots, optional),
//      CHROMIUM_PATH (optional executable path).
const SHOTS = process.env.SHOTS;
const BASE = process.env.WEB_URL || 'http://localhost:8081';
const API = process.env.API_URL || 'http://localhost:8000';
// Must be listed in the API's ADMIN_EMAILS.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
const stamp = Date.now();
const TITLE = `Front yard needs mowing this weekend #${stamp % 100000}`;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const newUser = async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    page.on('dialog', (d) => d.accept());
    return page;
  };
  const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : Promise.resolve());

  // 1. Maria registers and posts a lawncare listing
  const maria = await newUser();
  await maria.goto(BASE);
  await maria.getByText('How it works').waitFor();
  await shot(maria, '00-welcome');
  await maria.getByText('Questions? Read Help & Safety').click();
  await maria.getByText('Staying safe').waitFor();
  await shot(maria, '00-help');
  await maria.goBack();
  await maria.getByText('How it works').waitFor();
  await maria.getByRole('button', { name: "Join EasyHand. It's free" }).click();
  await maria.getByLabel('Your name').fill('Maria Lopez');
  await maria.getByLabel('Neighborhood').fill('Midtown');
  await maria.getByLabel('Email').fill(`maria${stamp}@example.com`);
  await maria.getByLabel('Password').fill('password123');
  await maria.getByRole('checkbox').click();
  await shot(maria, '01-register');
  await maria.getByRole('button', { name: 'Create account' }).click();
  await maria.getByText('Community Board').waitFor();
  await maria.getByText('Post', { exact: true }).click();
  await maria.getByRole('button', { name: 'Lawncare' }).filter({ visible: true }).click();
  await maria.getByLabel('Short title').fill(TITLE);
  await maria.getByLabel('Details').fill('Small front yard off Cooper St. Mower and trimmer are in the shed.');
  await maria.getByLabel('What will you pay? (optional)').fill('$30 + lemonade');
  await shot(maria, '02-new-post');
  await maria.getByRole('button', { name: 'Post it' }).click();
  await maria.getByText('Manage your listing').waitFor();
  const postUrl = maria.url();
  await shot(maria, '03-post-detail-owner');

  // 2. Jay registers, fills in profile, finds the listing and messages Maria
  const jay = await newUser();
  await jay.goto(`${BASE}/register`);
  await jay.getByLabel('Your name').fill('Jay Carter');
  await jay.getByLabel('Neighborhood').fill('Midtown');
  await jay.getByLabel('Email').fill(`jay${stamp}@example.com`);
  await jay.getByLabel('Password').fill('password123');
  await jay.getByRole('checkbox').click();
  await jay.getByRole('button', { name: 'Create account' }).click();
  await jay.getByText('Community Board').waitFor();
  await jay.getByText('Profile', { exact: true }).click();
  await jay.getByRole('button', { name: 'Edit profile' }).click();
  await jay.getByLabel('About you').fill('Weekend mower and Wi-Fi fixer. Happy to help neighbors.');
  await jay.getByText('+ Lawn Care Enthusiast').click();
  await jay.getByText('+ Tech Coach').click();
  await jay.getByRole('button', { name: 'Save profile' }).click();
  await jay.getByText('Lawn Care Enthusiast').waitFor();
  await shot(jay, '04-profile');

  await jay.getByText('Home', { exact: true }).click();
  await jay.getByText(TITLE).waitFor();
  await shot(jay, '05-feed');
  // Category filter: Tech Support should hide the lawncare listing
  await jay.getByRole('button', { name: 'Tech Support' }).filter({ visible: true }).click();
  await jay.getByText(TITLE).waitFor({ state: 'hidden' });
  await jay.getByRole('button', { name: 'Lawncare' }).filter({ visible: true }).click();
  await jay.getByText(TITLE).click();
  await jay.getByRole('button', { name: 'Message Maria' }).click();
  await jay.getByPlaceholder('Write a message…').fill('Hi Maria! I can mow Saturday morning around 9. Does that work?');
  await jay.getByLabel('Send message').click();
  await jay.getByText('Does that work?').last().waitFor();
  await shot(jay, '06-chat-jay');

  // 3. Maria sees the conversation in her inbox and replies
  await maria.goto(`${BASE}/messages`);
  await maria.getByText('Jay Carter').first().waitFor();
  await shot(maria, '07-inbox');
  await maria.getByText('Jay Carter').first().click();
  await maria.getByText('Does that work?').last().waitFor();
  await maria.getByPlaceholder('Write a message…').fill('Perfect, see you Saturday! Gate code is 1234.');
  await maria.getByLabel('Send message').click();
  await maria.getByText('see you Saturday').last().waitFor();

  // Jay's open chat picks up the reply via polling
  await jay.getByText('see you Saturday').last().waitFor({ timeout: 10000 });
  await shot(jay, '08-chat-reply');

  // 4. Jay reports the listing, and a moderator hides it
  await jay.goto(postUrl);
  await jay.getByText('Report this listing').click();
  await jay.getByRole('radio', { name: 'Looks like a scam' }).click();
  await jay.getByLabel('Anything else we should know? (optional)').fill('Asked me to pay with gift cards first.');
  await shot(jay, '09-report');
  await jay.getByRole('button', { name: 'Send report' }).click();
  await jay.getByText('Thank you').waitFor();
  await jay.getByRole('button', { name: 'Close' }).click();

  // Create the moderator account through the API (409 just means it exists from an earlier run).
  await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'EasyHand Team', accepted_terms: true }),
  });
  const admin = await newUser();
  await admin.goto(`${BASE}/login`);
  await admin.getByLabel('Email').fill(ADMIN_EMAIL);
  await admin.getByLabel('Password').fill(ADMIN_PASSWORD);
  await admin.getByRole('button', { name: 'Log in' }).click();
  await admin.getByText('Community Board').waitFor();
  await admin.getByText('Profile', { exact: true }).click();
  await admin.getByRole('button', { name: 'Moderation' }).click();
  const reported = admin.getByRole('link', { name: TITLE, exact: true });
  await reported.waitFor();
  await shot(admin, '10-moderation');
  // The innermost element holding both this listing's link and a given button is this report's card.
  const cardWith = (button) =>
    admin.locator('div').filter({ has: reported }).filter({ has: admin.getByRole('button', { name: button }) }).last();
  await cardWith('Hide listing').getByRole('button', { name: 'Hide listing' }).click();
  await cardWith('Show listing again').waitFor();

  await jay.goto(BASE);
  await jay.getByText('Community Board').waitFor();
  await jay.getByRole('button', { name: 'Refresh' }).click();
  await jay.getByText(TITLE).waitFor({ state: 'hidden' });

  // 5. Maria forgot her password: request a link and use it (needs the API's log, where unsent emails go)
  if (process.env.EMAIL_LOG) {
    const log = () => fs.readFileSync(process.env.EMAIL_LOG, 'utf8');
    if (!log().includes('Jay Carter sent you a message on EasyHand')) throw new Error('No new-message email in log');

    const forgot = await newUser();
    await forgot.goto(`${BASE}/login`);
    await forgot.getByText('Forgot your password?').click();
    await forgot.getByLabel('Email').filter({ visible: true }).fill(`maria${stamp}@example.com`);
    await forgot.getByRole('button', { name: 'Email me a link' }).click();
    await forgot.getByText('Check your email').waitFor();
    await shot(forgot, '11-forgot-sent');

    let link;
    for (let i = 0; i < 20 && !link; i++) {
      const matches = [...log().matchAll(/\/reset-password\?token=([\w-]+)/g)];
      link = matches.length ? matches[matches.length - 1][1] : undefined;
      if (!link) await new Promise((r) => setTimeout(r, 250));
    }
    if (!link) throw new Error('No reset link in log');
    await forgot.goto(`${BASE}/reset-password?token=${link}`);
    await forgot.getByLabel('New password').fill('a-new-password');
    await forgot.getByLabel('Type it again').fill('a-new-password');
    await shot(forgot, '12-reset');
    await forgot.getByRole('button', { name: 'Save new password' }).click();
    await forgot.getByText('Community Board').waitFor();
  }

  await browser.close();
  console.log('E2E OK');
})().catch((e) => {
  console.error('E2E FAILED', e);
  process.exit(1);
});
