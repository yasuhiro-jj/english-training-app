import base64
import json
import os
import sys

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")

from app.services.google_play_service import GooglePlayService, PlayPurchaseError  # noqa: E402


def make_key_json() -> str:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    return json.dumps({
        "type": "service_account",
        "project_id": "p",
        "private_key_id": "k",
        "private_key": pem,
        "client_email": "sa@p.iam.gserviceaccount.com",
        "client_id": "1",
        "token_uri": "https://oauth2.googleapis.com/token",
    })


KEY = make_key_json()
P = GooglePlayService.parse_service_account


def b64(s: str, enc="utf-8") -> str:
    return base64.b64encode(s.encode(enc)).decode()


def test_raw_json():
    assert P(KEY)["client_email"] == "sa@p.iam.gserviceaccount.com"


def test_base64_json():
    assert P(b64(KEY))["type"] == "service_account"


def test_base64_with_newlines_and_spaces():
    v = b64(KEY)
    wrapped = "\n".join(v[i:i + 64] for i in range(0, len(v), 64)) + "\n  "
    assert P(wrapped)["type"] == "service_account"


def test_quoted_and_bom():
    assert P('"' + b64(KEY) + '"')["type"] == "service_account"
    assert P("\ufeff" + KEY)["type"] == "service_account"


def test_base64_of_utf8_bom_and_utf16_file():
    assert P(b64("\ufeff" + KEY))["type"] == "service_account"
    assert P(b64(KEY, "utf-16"))["type"] == "service_account"


def test_random_alnum_string_like_a_pasted_secret_is_rejected_with_503():
    # 本番の障害: 鍵ではない英数字40文字（RTDNの合言葉のような値）が入っていた
    secret = "3wQp9ZxL2mVbN7cYtR4uKhJ8sGfD6aEi1oXzWqMn"
    with pytest.raises(PlayPurchaseError) as e:
        P(secret)
    assert e.value.status_code == 503
    assert secret not in str(e.value)  # 値そのものはエラーに含めない


def test_non_base64_text_rejected():
    with pytest.raises(PlayPurchaseError) as e:
        P("this is not a key!!")
    assert e.value.status_code == 503


def test_json_that_is_not_a_service_account_rejected():
    with pytest.raises(PlayPurchaseError) as e:
        P(json.dumps({"web": {"client_id": "x", "client_secret": "y"}}))
    assert e.value.status_code == 503


def test_credentials_status(monkeypatch):
    s = GooglePlayService()
    monkeypatch.setenv("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", b64(KEY))
    assert s.credentials_status() == (True, "ok")
    monkeypatch.setenv("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "3wQp9ZxL2mVbN7cYtR4uKhJ8sGfD6aEi1oXzWqMn")
    ok, reason = s.credentials_status()
    assert ok is False and "base64" in reason or "JSON" in reason
    monkeypatch.delenv("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", raising=False)
    assert s.credentials_status() == (False, "not set")


def test_load_credentials_builds_object(monkeypatch):
    s = GooglePlayService()
    monkeypatch.setenv("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", b64(KEY))
    creds = s._load_credentials()
    assert creds.service_account_email == "sa@p.iam.gserviceaccount.com"
