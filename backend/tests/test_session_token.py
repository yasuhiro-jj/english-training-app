import os
import sys
from datetime import datetime, timedelta, timezone

import jwt

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")

from app.routes.session import _create_session_token, _decode_session_token  # noqa: E402

DATA = {
    "article_url": "generated",
    "article_title": "タイトル",
    "article_content": "Some English article content.\n日本語も含む。",
    "question": "What do you think?",
    "topic": "topic",
    "created_at": "2026-11-27T00:00:00",
    "lesson_data": {"title": "t", "category": "c", "level": "2", "date": "d", "japanese_title": "j"},
}


def _raw(payload, secret=None):
    return jwt.encode(payload, secret or os.environ["JWT_SECRET_KEY"], algorithm="HS256")


def _future():
    return datetime.now(timezone.utc) + timedelta(hours=1)


def test_roundtrip():
    out = _decode_session_token(_create_session_token(DATA))
    assert out is not None
    for k, v in DATA.items():
        assert out[k] == v
    assert out["token_type"] == "session"


def test_tampered():
    token = _create_session_token(DATA)
    head, body, sig = token.split(".")
    bad_sig = sig[:-2] + ("AA" if sig[-2:] != "AA" else "BB")
    assert _decode_session_token(head + "." + body + "." + bad_sig) is None
    assert _decode_session_token(head + "." + body[:-2] + "xx." + sig) is None
    assert _decode_session_token(_raw({**DATA, "token_type": "session", "exp": _future()}, "other")) is None


def test_expired():
    token = _raw({**DATA, "token_type": "session", "exp": datetime.now(timezone.utc) - timedelta(seconds=5)})
    assert _decode_session_token(token) is None


def test_wrong_type():
    assert _decode_session_token(_raw({**DATA, "token_type": "access", "exp": _future()})) is None
    assert _decode_session_token(_raw({**DATA, "exp": _future()})) is None


def test_garbage():
    assert _decode_session_token("not-a-jwt") is None
    assert _decode_session_token("") is None
