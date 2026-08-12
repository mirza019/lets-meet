import smtplib
from abc import ABC, abstractmethod
from email.message import EmailMessage
from html import escape

from app.core.config import Settings


class EmailProvider(ABC):
    @abstractmethod
    def send(self, to: str, subject: str, html: str, text: str) -> None: ...


class ConsoleEmailProvider(EmailProvider):
    def send(self, to: str, subject: str, html: str, text: str) -> None:
        print(f"EMAIL to={to!r} subject={subject!r}\n{text}")


class ResendEmailProvider(EmailProvider):
    def __init__(self, settings: Settings):
        import resend

        resend.api_key = settings.resend_api_key
        self.resend = resend
        self.sender = settings.email_from

    def send(self, to: str, subject: str, html: str, text: str) -> None:
        self.resend.Emails.send({"from": self.sender, "to": [to], "subject": subject, "html": html, "text": text})


class GmailSMTPProvider(EmailProvider):
    def __init__(self, settings: Settings):
        if not settings.smtp_username or not settings.smtp_app_password:
            raise RuntimeError("Gmail SMTP requires SMTP_USERNAME and SMTP_APP_PASSWORD.")
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.use_ssl = settings.smtp_use_ssl
        self.username = settings.smtp_username
        self.password = settings.smtp_app_password.replace(" ", "")
        self.sender = settings.email_from

    def send(self, to: str, subject: str, html: str, text: str) -> None:
        message = EmailMessage()
        message["From"] = self.sender
        message["Reply-To"] = self.username
        message["To"] = to
        message["Subject"] = subject
        message.set_content(text)
        message.add_alternative(html, subtype="html")
        if self.use_ssl:
            with smtplib.SMTP_SSL(self.host, self.port, timeout=15) as smtp:
                smtp.login(self.username, self.password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(self.host, self.port, timeout=15) as smtp:
                smtp.starttls()
                smtp.login(self.username, self.password)
                smtp.send_message(message)


class EmailService:
    def __init__(self, settings: Settings):
        self.settings = settings
        gmail_ready = bool(settings.smtp_username and settings.smtp_app_password)
        providers = {
            "console": lambda: ConsoleEmailProvider(),
            "resend": lambda: ResendEmailProvider(settings),
            "gmail": lambda: GmailSMTPProvider(settings) if gmail_ready else ConsoleEmailProvider(),
            "smtp": lambda: GmailSMTPProvider(settings) if gmail_ready else ConsoleEmailProvider(),
        }
        try:
            self.provider = providers[settings.email_provider]()
        except KeyError as exc:
            raise RuntimeError(f"Unsupported EMAIL_PROVIDER: {settings.email_provider}") from exc
        self.delivery_mode = "console" if isinstance(self.provider, ConsoleEmailProvider) else "sent"

    def invitation(self, to: str, guest: str, host: str, url: str, note: str | None) -> None:
        personal_note = f"\n\n{note.strip()}" if note and note.strip() else ""
        text = (
            f"Hey {guest},\n\n"
            f"So… you wanna meet {host}? Cute.\n\n"
            f"{host} sent you a private little challenge: build a plan tempting enough "
            "to earn some very exclusive calendar space. Choose the day, plan the fun, "
            f"and make a dangerously strong case for snacks.{personal_note}\n\n"
            f"— {host}\n\n"
            f"View invitation: {url}\n\n"
            f"This message was sent because {host} entered your email in Let's Meet. "
            "If you were not expecting it, you can safely ignore this email."
        )
        self.provider.send(
            to,
            f"You want to meet {host}? Build your best plan 👀",
            self._html(text, url, "View invitation"),
            text,
        )

    def proposal(self, to: str, recipient: str, author: str, url: str, counter: bool) -> None:
        intro = (
            f"{author} added a cheeky little plot twist to the meetup plan. Your attention is required."
            if counter
            else f"{recipient}, {author} built a whole little plan to earn your time. Inspect the effort."
        )
        text = f"{intro}\n\nReview the private plan: {url}"
        self.provider.send(
            to,
            f"{author} made a plan to impress you 👀",
            self._html(text, url, "Review plan"),
            text,
        )

    def confirmation(self, to: str, first: str, second: str, url: str, plan_details: str) -> None:
        text = (
            f"{first} + {second}: the calendar audition was a success. Try to act casual.\n\n"
            f"Here is the agreed plan for your records:\n\n{plan_details}\n\n"
            f"View the private plan: {url}"
        )
        self.provider.send(
            to,
            f"Plan confirmed with {second} — Let's Meet",
            self._html(text, url, "View full plan"),
            text,
        )

    @staticmethod
    def _html(text: str, url: str, label: str) -> str:
        body = escape(text).replace("\n", "<br>")
        return f'<div style="font:16px system-ui;line-height:1.6;color:#172036"><p>{body}</p><a href="{escape(url)}" style="background:#ff6b6b;color:white;padding:12px 18px;border-radius:999px;text-decoration:none">{label}</a></div>'
