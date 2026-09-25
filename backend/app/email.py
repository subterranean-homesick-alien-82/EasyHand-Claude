"""Outgoing email. Uses Resend when RESEND_API_KEY is set; otherwise emails are logged (development and tests)."""

import html
import logging
from dataclasses import dataclass

import httpx

from .config import get_settings

# Log through uvicorn's logger so unsent emails show up in the server output during development.
log = logging.getLogger("uvicorn.error")


@dataclass
class Email:
    to: str
    subject: str
    text: str
    html: str


# Emails "sent" without an API key, newest last. Tests read this.
outbox: list[Email] = []


async def send_email(email: Email) -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        outbox.append(email)
        log.info("Email (not sent, RESEND_API_KEY unset) to=%s subject=%r\n%s", email.to, email.subject, email.text)
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={
                    "from": settings.email_from,
                    "to": [email.to],
                    "subject": email.subject,
                    "text": email.text,
                    "html": email.html,
                },
            )
            res.raise_for_status()
    except httpx.HTTPError:
        # Email is best-effort: never fail the user's request because of it.
        log.exception("Failed to send email to %s (%r)", email.to, email.subject)


def _layout(heading: str, paragraphs: list[str], button_text: str, button_url: str, footer: str) -> str:
    """Simple, large-text HTML email that renders well in common mail apps."""
    body = "".join(f'<p style="font-size:18px;line-height:1.5;margin:0 0 16px">{p}</p>' for p in paragraphs)
    return f"""<!doctype html>
<html><body style="margin:0;background:#F6F4EE;font-family:Arial,Helvetica,sans-serif;color:#1F2A24">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <p style="font-size:26px;font-weight:bold;color:#1D5236;margin:0 0 24px">EasyHand</p>
  <div style="background:#ffffff;border:1px solid #D6D1C2;border-radius:16px;padding:24px">
    <p style="font-size:22px;font-weight:bold;margin:0 0 16px">{heading}</p>
    {body}
    <a href="{html.escape(button_url, quote=True)}"
       style="display:inline-block;background:#276B48;color:#ffffff;font-size:18px;font-weight:bold;
              text-decoration:none;padding:16px 28px;border-radius:12px;margin-top:8px">{button_text}</a>
  </div>
  <p style="font-size:15px;line-height:1.5;color:#4E5A53;margin:24px 0 0">{footer}</p>
</div>
</body></html>"""


def password_reset_email(to: str, name: str, token: str) -> Email:
    url = f"{get_settings().app_url}/reset-password?token={token}"
    first = html.escape(name.split(" ")[0] or name)
    return Email(
        to=to,
        subject="Reset your EasyHand password",
        text=(
            f"Hi {name.split(' ')[0]},\n\n"
            f"Someone asked to reset your EasyHand password. To choose a new one, open this link:\n{url}\n\n"
            "The link works for 1 hour. If you didn't ask for this, you can ignore this email; "
            "your password won't change.\n\nThe EasyHand team"
        ),
        html=_layout(
            f"Hi {first},",
            [
                "Someone asked to reset your EasyHand password. Tap the button below to choose a new one.",
                "The link works for 1 hour.",
            ],
            "Choose a new password",
            url,
            "If you didn't ask for this, you can ignore this email. Your password won't change.",
        ),
    )


def new_message_email(to: str, sender_name: str, sender_id: str, content: str, post_title: str | None) -> Email:
    settings = get_settings()
    url = f"{settings.app_url}/chat/{sender_id}"
    about = f' about "{post_title}"' if post_title else ""
    preview = content if len(content) <= 300 else content[:297] + "..."
    return Email(
        to=to,
        subject=f"{sender_name} sent you a message on EasyHand",
        text=(
            f"{sender_name} sent you a message{about}:\n\n\"{preview}\"\n\n"
            f"Read and reply: {url}\n\n"
            "To stop these emails, open EasyHand, go to Profile, tap Edit profile and untick "
            '"Email me when I get a message".'
        ),
        html=_layout(
            f"{html.escape(sender_name)} sent you a message{html.escape(about)}",
            [f'<span style="color:#4E5A53">&ldquo;{html.escape(preview)}&rdquo;</span>'],
            "Read and reply",
            url,
            'To stop these emails, open EasyHand, go to Profile, tap Edit profile and untick "Email me when I get a message".',
        ),
    )
