import base64
import hashlib
import secrets

from cryptography.fernet import Fernet


def create_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _fernet(secret: str) -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def encrypt_token(token: str, secret: str) -> str:
    return _fernet(secret).encrypt(token.encode()).decode()


def decrypt_token(value: str, secret: str) -> str:
    return _fernet(secret).decrypt(value.encode()).decode()
