import httpx
from typing import Optional, Dict, Any
from urllib.parse import urlparse
from apps.api.app.security.ssrf import SSRFValidator, SSRFSecurityException
from apps.api.app.config import get_settings

settings = get_settings()

DEFAULT_USER_AGENT = "DevKnowledgeCrawler/1.0 (+https://devknowledge.local; developer documentation intelligence)"


class SafeHTTPClient:
    """
    HTTP client hardened against SSRF, DNS rebinding, and malicious redirects.
    """

    def __init__(self, timeout: int = 15, headers: Optional[Dict[str, str]] = None):
        self.timeout = timeout
        base_headers = {"User-Agent": DEFAULT_USER_AGENT, "Accept": "text/html,application/xhtml+xml,text/plain"}
        if headers:
            base_headers.update(headers)
        self.headers = base_headers

    async def get(self, url: str) -> httpx.Response:
        # Pre-flight SSRF validation
        canonical_url, _ = SSRFValidator.validate_url(url, allow_private=settings.ALLOW_PRIVATE_IPS)

        async with httpx.AsyncClient(
            timeout=self.timeout,
            headers=self.headers,
            follow_redirects=False, # We handle redirects manually with re-validation!
        ) as client:
            current_url = canonical_url
            max_redirects = 5

            for _ in range(max_redirects):
                resp = await client.get(current_url)
                if resp.is_redirect:
                    location = resp.headers.get("Location")
                    if not location:
                        return resp
                    # Resolve relative redirect
                    from urllib.parse import urljoin
                    next_url = urljoin(current_url, location)
                    # Revalidate redirect destination against SSRF!
                    canonical_next, _ = SSRFValidator.validate_url(next_url, allow_private=settings.ALLOW_PRIVATE_IPS)
                    current_url = canonical_next
                else:
                    return resp

            raise SSRFSecurityException(f"Too many redirects while fetching '{url}'")
