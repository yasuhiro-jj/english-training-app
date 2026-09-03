import time
from collections import defaultdict
from threading import Lock


class RateLimiter:
    """
    シンプルなインメモリのレート制限（固定ウィンドウ）。

    単一プロセスでの運用を前提とした簡易実装。複数インスタンス/ワーカーに
    スケールする場合は Redis 等の共有ストアに置き換えること。
    """

    def __init__(self):
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def is_allowed(self, key: str, max_attempts: int, window_seconds: int) -> bool:
        now = time.time()
        with self._lock:
            attempts = self._hits[key]
            cutoff = now - window_seconds
            while attempts and attempts[0] < cutoff:
                attempts.pop(0)

            if len(attempts) >= max_attempts:
                return False

            attempts.append(now)
            return True


rate_limiter = RateLimiter()
