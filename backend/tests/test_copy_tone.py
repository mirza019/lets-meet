from pathlib import Path


def test_user_facing_copy_does_not_explain_or_deny_the_vibe():
    root = Path(__file__).resolve().parents[2]
    sources = [
        *sorted((root / "frontend" / "src").rglob("*.tsx")),
        *sorted((root / "frontend" / "src").rglob("*.ts")),
        root / "backend" / "app" / "email" / "service.py",
    ]
    combined = "\n".join(path.read_text().lower() for path in sources)
    for phrase in (
        "not romantic",
        "romantic declaration",
        "this is not romance",
        "not a date",
        "date-ish",
        "dateish",
        "cute",
        "flirty",
        "flirting",
    ):
        assert phrase not in combined

    assert "loading the drama" in combined
