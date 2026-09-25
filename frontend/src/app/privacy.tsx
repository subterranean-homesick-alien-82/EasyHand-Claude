import { LegalPage } from '@/components/LegalPage';

// Plain-language starting point for the Memphis pilot. Have a lawyer review before a wider launch.
export default function PrivacyScreen() {
  return (
    <LegalPage
      updated="September 2026"
      intro="Your privacy matters to us. This page explains what we collect, why, and what we never do."
      sections={[
        {
          heading: 'What we collect',
          body: 'The information you give us: your name, email address, neighborhood, bio, skills, listings, photos and messages. We also keep basic technical records such as when you log in, to keep the service running and secure.',
        },
        {
          heading: 'What other members can see',
          body: 'Your name, neighborhood, bio, skills and listings are visible to other members. Your email address is never shown to other members. Messages are only visible to you and the person you are talking with.',
        },
        {
          heading: 'How we use it',
          body: 'To run EasyHand, to send you emails you need (such as new message alerts and password resets), to keep the community safe, and to review reports. EasyHand staff may read messages only when investigating a report or a safety concern.',
        },
        {
          heading: 'What we never do',
          body: 'We do not sell your information. We do not show you ads based on your information.',
        },
        {
          heading: 'Services we rely on',
          body: 'We use trusted providers to host the app and database, store photos and send email. They only process your information to provide those services to us.',
        },
        {
          heading: 'Your choices',
          body: 'You can edit your profile at any time. To delete your account and your information, contact us from the Help & Safety page and we will take care of it.',
        },
      ]}
    />
  );
}
