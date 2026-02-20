"""Field-level encryption for sensitive data (Gmail tokens, etc.)."""
from cryptography.fernet import Fernet
import os
import base64
import hashlib

_cipher = None


def _get_cipher():
    global _cipher
    if _cipher is None:
        key = os.environ.get("ENCRYPTION_KEY", "")
        if not key:
            # Derive a key from MONGO_URL as fallback (deterministic)
            seed = os.environ.get("MONGO_URL", "fallback-seed")
            derived = hashlib.sha256(seed.encode()).digest()
            key = base64.urlsafe_b64encode(derived).decode()
        # Ensure key is valid Fernet key (32 url-safe base64 bytes)
        if len(base64.urlsafe_b64decode(key + "==")) != 32:
            seed = key
            derived = hashlib.sha256(seed.encode()).digest()
            key = base64.urlsafe_b64encode(derived).decode()
        _cipher = Fernet(key)
    return _cipher


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value. Returns base64-encoded ciphertext."""
    if not plaintext:
        return plaintext
    return _get_cipher().encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a previously encrypted value."""
    if not ciphertext:
        return ciphertext
    try:
        return _get_cipher().decrypt(ciphertext.encode()).decode()
    except Exception:
        # If decryption fails, return as-is (may be unencrypted legacy data)
        return ciphertext
