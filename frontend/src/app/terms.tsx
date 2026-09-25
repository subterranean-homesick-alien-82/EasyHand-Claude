import { LegalPage } from '@/components/LegalPage';

// Plain-language starting point for the Memphis pilot. Have a lawyer review before a wider launch.
export default function TermsScreen() {
  return (
    <LegalPage
      updated="September 2026"
      intro="These terms explain how EasyHand works and what we ask of everyone who uses it. By creating an account you agree to them."
      sections={[
        {
          heading: 'What EasyHand is',
          body: 'EasyHand is a community board that helps neighbors find each other to give or get help with everyday tasks. EasyHand is not an employer, staffing agency or contractor. Members who help each other are not EasyHand employees or agents.',
        },
        {
          heading: 'Who can join',
          body: 'You must be at least 18 years old. Please use your real name and keep your account details to yourself. You are responsible for what happens on your account.',
        },
        {
          heading: 'We do not screen members',
          body: 'EasyHand does not run background checks, verify identities, or check licenses, insurance or skills. You decide who you work with. Use the safety tips on the Help & Safety page and use your own judgment.',
        },
        {
          heading: 'Payments are between members',
          body: 'Any price, payment, refund or dispute is between you and the other member. EasyHand does not handle money, take fees, or guarantee that work is done or paid for.',
        },
        {
          heading: 'Be a good neighbor',
          body: 'Be honest in your listings and messages. Do not post anything illegal, dangerous, hateful, sexual or misleading. Do not harass anyone, spam, or ask for money upfront in bad faith. Do not offer work that legally requires a license you do not have.',
        },
        {
          heading: 'Reporting and removal',
          body: 'You can report a listing or a person at any time. We may hide listings or suspend accounts that break these terms or put others at risk, with or without notice.',
        },
        {
          heading: 'No warranties',
          body: 'EasyHand is provided as it is, without guarantees. To the fullest extent the law allows, EasyHand is not responsible for injury, loss, damage or disputes that come from using the service or from dealings between members.',
        },
        {
          heading: 'Changes',
          body: 'We may update these terms as EasyHand grows. If we make important changes we will let you know in the app. Continuing to use EasyHand means you accept the updated terms.',
        },
        {
          heading: 'Governing law',
          body: 'These terms are governed by the laws of the State of Tennessee.',
        },
      ]}
    />
  );
}
