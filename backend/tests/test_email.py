from app.core.config import Settings
from app.email.service import ConsoleEmailProvider, EmailService, GmailSMTPProvider


def test_gmail_provider_activates_only_with_app_password():
    missing = Settings(email_provider="gmail", smtp_username="sender@gmail.com", smtp_app_password="")
    assert isinstance(EmailService(missing).provider, ConsoleEmailProvider)

    configured = Settings(
        email_provider="gmail",
        smtp_username="sender@gmail.com",
        smtp_app_password="abcd efgh ijkl mnop",
        email_from="Let's Meet <sender@gmail.com>",
    )
    service = EmailService(configured)
    assert isinstance(service.provider, GmailSMTPProvider)
    assert service.provider.password == "abcdefghijklmnop"


def test_invitation_email_speaks_in_the_senders_voice():
    sent = {}

    class RecordingProvider:
        def send(self, to, subject, html, text):
            sent.update(to=to, subject=subject, html=html, text=text)

    service = EmailService(Settings(email_provider="console"))
    service.provider = RecordingProvider()
    service.invitation(
        "jamie@example.com",
        "Jamie",
        "Alex",
        "https://example.test/private",
        "Your calendar has been selected.",
    )

    assert sent["subject"] == "You want to meet Alex? Build your best plan 👀"
    assert "Hey Jamie" in sent["text"]
    assert "you wanna meet Alex? Cute" in sent["text"]
    assert "earn some very exclusive calendar space" in sent["text"]
    assert "dangerously strong case for snacks" in sent["text"]
    assert "— Alex" in sent["text"]
    assert "View invitation" in sent["html"]


def test_confirmation_email_contains_the_full_plan_record():
    sent = {}

    class RecordingProvider:
        def send(self, to, subject, html, text):
            sent.update(to=to, subject=subject, html=html, text=text)

    service = EmailService(Settings(email_provider="console"))
    service.provider = RecordingProvider()
    details = "Date: 2027-03-20\nTime: 19:00\nFood: Dinner — Korean Chicken\nActivities: Walk → Shisha"
    service.confirmation(
        "jamie@example.com",
        "Jamie",
        "Alex",
        "https://example.test/confirmed",
        details,
    )

    assert sent["subject"] == "Plan confirmed with Alex — Let's Meet"
    assert details in sent["text"]
    assert "for your records" in sent["text"]
    assert "View full plan" in sent["html"]
