import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, Smartphone, ShieldCheck, ChevronRight } from 'lucide-react';
import { SITE } from '../lib/site';
import './info-pages.css';

const mail = SITE.supportEmail;
const MailLink = () => <a href={`mailto:${mail}`}>{mail}</a>;

function Section({ title, children }) {
  return (
    <section className="cf-info-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Steps({ items }) {
  return (
    <ol className="cf-info-steps">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ol>
  );
}

/* ---------------- Download ---------------- */
function DownloadPage({ go }) {
  const [apk, setApk] = useState('checking');
  useEffect(() => {
    let alive = true;
    fetch(SITE.apkPath, { method: 'HEAD' })
      .then(r => { if (alive) setApk(r.ok && !/text\/html/.test(r.headers.get('content-type') || '') ? 'yes' : 'no'); })
      .catch(() => { if (alive) setApk('no'); });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <div className="cf-info-hero">
        <img src="/icon-192.png" alt="" width="72" height="72" />
        <h1>Get CampusFlip</h1>
        <p>The marketplace for KUHeS students. Buy, sell and meet safely on campus.</p>
        {apk === 'yes' ? (
          <a className="cf-info-cta" href={SITE.apkPath} download>
            <Download size={18} /> Download for Android
          </a>
        ) : (
          <button type="button" className="cf-info-cta" onClick={() => document.getElementById('install-browser')?.scrollIntoView({ behavior: 'smooth' })}>
            <Smartphone size={18} /> Install from your browser
          </button>
        )}
        <small>Free. Works on slow data. {apk === 'no' && 'The Android file is coming soon, and the browser install below works the same way.'}</small>
      </div>

      {apk === 'yes' && (
        <Section title="Install on Android (the file you just downloaded)">
          <Steps items={[
            'Tap Download for Android. If your phone warns that this type of file can be harmful, tap Download anyway. It is the normal message for any app that is not from the Play Store.',
            'Open the file when it finishes (it is in your Downloads or the notification).',
            'If asked, allow your browser to install apps: tap Settings, switch on Allow from this source, then go back.',
            'Tap Install. If Play Protect says it does not recognise the app, tap More details, then Install anyway.',
            'Open CampusFlip and sign in with your KUHeS email.',
          ]} />
          <p className="cf-info-note">Only install the file from this page. We will never send you the app on WhatsApp or ask for your password.</p>
        </Section>
      )}

      <Section title="Install from your browser (no file needed)">
        <div id="install-browser" />
        <h3>Android (Chrome)</h3>
        <Steps items={[
          'Open this site in Chrome.',
          'Tap the three dots at the top right.',
          'Tap Install app (or Add to Home screen), then Install.',
        ]} />
        <h3>iPhone (Safari)</h3>
        <Steps items={[
          'Open this site in Safari.',
          'Tap the Share button (the square with an arrow).',
          'Tap Add to Home Screen, then Add.',
        ]} />
      </Section>

      <Section title="Why it is safe">
        <ul className="cf-info-list">
          <li>Only students with a verified @kuhes.ac.mw email can sign up.</li>
          <li>Payments go through mobile money. We never see your PIN.</li>
          <li>Sellers' phone numbers are only shown to signed-in students.</li>
          <li>Read how we handle your information in the <button type="button" onClick={() => go('/privacy-policy')}>Privacy Policy</button>.</li>
        </ul>
      </Section>

      <Section title="Need help?">
        <button type="button" className="cf-info-link" onClick={() => go('/help')}>How to use CampusFlip <ChevronRight size={16} /></button>
        <p>Or email us at <MailLink />.</p>
      </Section>
    </>
  );
}

/* ---------------- Help ---------------- */
function HelpPage({ go }) {
  return (
    <>
      <div className="cf-info-hero small">
        <h1>How to use CampusFlip</h1>
        <p>Everything you need in a few minutes.</p>
      </div>
      <Section title="1. Create your account">
        <Steps items={[
          'Tap Sign up and enter your @kuhes.ac.mw email and a password.',
          'Open the verification email we send you and tap the link. Check your spam folder if it is not there.',
          'Sign in. New students get 2 free listings as a welcome gift.',
          'Add your WhatsApp number under Account → Personal details so buyers can reach you.',
        ]} />
      </Section>
      <Section title="2. Sell something">
        <Steps items={[
          'Tap Post, choose what you are selling, add clear photos, a fair price and a safe meeting spot.',
          'Publish it using a free listing or pay the small listing fee with mobile money (Airtel Money or TNM Mpamba).',
          'Want more eyes? Open My Shop and use Boost or Flash deal on your listing. You can see what is running and how long is left.',
          'Mark it sold when it is gone.',
        ]} />
      </Section>
      <Section title="3. Buy something">
        <Steps items={[
          'Browse, search or filter by category. Tap the heart to save things for later.',
          'Tap Contact seller to chat with them on WhatsApp. The message already includes the listing link.',
          'Meet at a campus meeting spot, check the item before paying, and pay in person.',
        ]} />
        <p className="cf-info-note">Looking for something nobody has posted? Post it as Wanted and we will tell you when a match appears.</p>
      </Section>
      <Section title="4. Stay safe">
        <ul className="cf-info-list">
          <li>Meet in busy places on campus, in daylight if you can.</li>
          <li>Never send money before you have seen the item.</li>
          <li>Nobody from CampusFlip will ask for your password or mobile money PIN.</li>
          <li>See something wrong? Tap Report on the listing and our team will review it.</li>
        </ul>
      </Section>
      <Section title="5. Notifications">
        <p>Go to Account → Notifications to choose which alerts you get, and switch on Push notifications to get them even when the app is closed.</p>
      </Section>
      <Section title="Still stuck?">
        <p>Email <MailLink /> and we will help.</p>
        <button type="button" className="cf-info-link" onClick={() => go('/download')}>Install the app <ChevronRight size={16} /></button>
      </Section>
    </>
  );
}

/* ---------------- Privacy ---------------- */
function PrivacyPage() {
  return (
    <>
      <div className="cf-info-hero small">
        <ShieldCheck size={32} />
        <h1>Privacy Policy</h1>
        <p>Last updated {SITE.updated}</p>
      </div>
      <Section title="Who we are">
        <p>{SITE.name} is a student marketplace for {SITE.university}, run by the {SITE.name} team. If you have a question about your information, write to <MailLink />.</p>
      </Section>
      <Section title="What we collect">
        <ul className="cf-info-list">
          <li><b>Account details:</b> your name, KUHeS email address, password (stored securely hashed, we cannot read it), profile photo and optional business name.</li>
          <li><b>Contact number:</b> the WhatsApp number you add so buyers can reach you.</li>
          <li><b>Listings:</b> titles, descriptions, prices, photos, categories and meeting spots you post, plus how many people viewed them.</li>
          <li><b>Payments:</b> the mobile money number, network, amount and status of payments for listings, boosts and flash deals. We never receive your PIN.</li>
          <li><b>Activity:</b> items you save, reports you send, referrals, notification settings and the notifications we send you.</li>
          <li><b>Device information for alerts:</b> if you switch on push notifications, a code that lets us send alerts to your phone.</li>
          <li><b>Error reports:</b> when the app crashes, an anonymous report (your anonymous account number, browser and the page, but not your name or email) so we can fix it.</li>
        </ul>
      </Section>
      <Section title="How we use it">
        <ul className="cf-info-list">
          <li>To run the marketplace: show your listings, let buyers contact you and match Wanted posts.</li>
          <li>To process payments and give you free listings and referral credits.</li>
          <li>To send notifications you asked for, and to keep the community safe (reviewing reports, limiting abuse).</li>
          <li>To find and fix problems in the app.</li>
        </ul>
        <p>We do not sell your information and we do not show advertising.</p>
      </Section>
      <Section title="Who can see it">
        <ul className="cf-info-list">
          <li><b>Other students:</b> your name, photo, listings and, when they sign in and tap Contact, your WhatsApp number for an active listing. Your email is never shown to other students.</li>
          <li><b>Service providers who help us run CampusFlip:</b> Supabase (database and sign-in), Cloudflare (hosting), Cloudinary (photo storage), PayChangu and the mobile money networks (payments) and Sentry (error reports). They only process data for us.</li>
          <li><b>Authorities:</b> only if the law requires it.</li>
        </ul>
      </Section>
      <Section title="How long we keep it">
        <p>We keep your information while your account is open. When you delete your account, your listings are removed straight away and the rest of your information, including your payment records on CampusFlip, is permanently deleted after 30 days. Payment providers and mobile money networks keep their own records under their own rules. Photos are removed from our listings, and error reports are kept for a short period by our error-monitoring provider.</p>
      </Section>
      <Section title="Your choices">
        <ul className="cf-info-list">
          <li>Edit your details any time under Account → Personal details.</li>
          <li>Turn alerts on or off under Account → Notifications.</li>
          <li>Delete your account under Account → Privacy &amp; security. Your listings are removed straight away. The rest of your account information is permanently deleted after 30 days. Email <MailLink /> if you want us to confirm it.</li>
          <li>To ask for a copy of your information or a correction, email <MailLink />.</li>
        </ul>
      </Section>
      <Section title="Security">
        <p>Your data is protected by encrypted connections and access rules in our database that stop one student reading another's private information. No system is perfectly secure, so please use a strong password and never share it.</p>
      </Section>
      <Section title="Children">
        <p>{SITE.name} is for university students and is not meant for children under 16.</p>
      </Section>
      <Section title="Changes">
        <p>If we change this policy we will update the date above and, for important changes, tell you in the app.</p>
      </Section>
    </>
  );
}

/* ---------------- Terms ---------------- */
function TermsPage() {
  return (
    <>
      <div className="cf-info-hero small">
        <h1>Terms of Use</h1>
        <p>Last updated {SITE.updated}</p>
      </div>
      <Section title="Using CampusFlip">
        <p>CampusFlip lets {SITE.university} students list and find items and services. By signing up you agree to these terms and to our Privacy Policy.</p>
      </Section>
      <Section title="Your account">
        <ul className="cf-info-list">
          <li>You must be a KUHeS student or staff member with a verified @kuhes.ac.mw email.</li>
          <li>Keep your password private. You are responsible for what happens on your account.</li>
          <li>One person, one account. Do not create extra accounts to collect free credits.</li>
        </ul>
      </Section>
      <Section title="What you may post">
        <ul className="cf-info-list">
          <li>Only things you own or are allowed to sell, described honestly with your own photos.</li>
          <li>No illegal items, weapons, drugs, stolen goods, exam papers or answers, or anything harmful or fraudulent.</li>
          <li>No harassment, hate speech, adult content or spam.</li>
        </ul>
        <p>We may remove listings and suspend accounts that break these rules.</p>
      </Section>
      <Section title="Deals between students">
        <p>CampusFlip only connects buyers and sellers. Deals are made directly between students, so check items before you pay and meet in safe places. We are not a party to any sale and cannot guarantee any item or person, but please report problems and we will act on them.</p>
      </Section>
      <Section title="Fees, boosts and credits">
        <p>Some features (extra listings, boosts, flash deals) cost money, shown before you pay. Free listing credits have no cash value. Paid fees for services already delivered are not refundable, but contact us at <MailLink /> if something went wrong with a payment.</p>
      </Section>
      <Section title="Limits">
        <p>To keep the community safe we limit how fast accounts can post, report and contact sellers. The service is provided as is and may sometimes be unavailable. To the extent the law allows, CampusFlip is not liable for losses from deals between users.</p>
      </Section>
      <Section title="Contact">
        <p>Questions about these terms? Email <MailLink />.</p>
      </Section>
    </>
  );
}

const PAGES = { download: DownloadPage, help: HelpPage, privacyPolicy: PrivacyPage, terms: TermsPage };

export default function InfoPages({ page, onBack, onGo }) {
  const Page = PAGES[page];
  useEffect(() => { document.title = `CampusFlip — ${page === 'privacyPolicy' ? 'Privacy Policy' : page[0].toUpperCase() + page.slice(1)}`; }, [page]);
  if (!Page) return null;
  return (
    <main className="cf-info">
      <header className="cf-info-top">
        <button type="button" onClick={onBack} aria-label="Go back"><ArrowLeft size={19} /></button>
        <span>CampusFlip</span>
      </header>
      <div className="cf-info-body">
        <Page go={onGo} />
        <footer className="cf-info-footer">
          <button type="button" onClick={() => onGo('/privacy-policy')}>Privacy Policy</button>
          <button type="button" onClick={() => onGo('/terms')}>Terms</button>
          <button type="button" onClick={() => onGo('/help')}>Help</button>
          <button type="button" onClick={() => onGo('/download')}>Get the app</button>
        </footer>
      </div>
    </main>
  );
}
