import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple, Optional


class SSRFSecurityException(Exception):
    pass


class SSRFValidator:
    """
    Validates target URLs to defend against Server-Side Request Forgery (SSRF),
    local network scanning, and cloud metadata access.
    """

    ALLOWED_SCHEMES = {"http", "https"}

    @classmethod
    def is_ip_prohibited(cls, ip_str: str) -> bool:
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            return True

        # Check loopback, private, link-local, multicast, reserved
        if (
            ip.is_loopback
            or ip.is_private
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            return True

        # Explicit AWS / GCP / Azure metadata endpoint: 169.254.169.254
        if str(ip) == "169.254.169.254":
            return True

        # IPv6 IPv4-mapped addresses (e.g. ::ffff:127.0.0.1)
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            if cls.is_ip_prohibited(str(ip.ipv4_mapped)):
                return True

        return False

    @classmethod
    def validate_url(cls, url: str, allow_private: bool = False) -> Tuple[str, str]:
        """
        Validates URL scheme, resolves hostname to IP, checks against prohibited ranges.
        Returns (canonical_url, resolved_ip).
        Raises SSRFSecurityException if invalid.
        """
        if not url:
            raise SSRFSecurityException("URL cannot be empty")

        parsed = urlparse(url.strip())
        if parsed.scheme.lower() not in cls.ALLOWED_SCHEMES:
            raise SSRFSecurityException(f"Prohibited URL scheme: '{parsed.scheme}'. Only http and https allowed.")

        hostname = parsed.hostname
        if not hostname:
            raise SSRFSecurityException(f"Missing hostname in URL: '{url}'")

        if hostname.lower() in {"localhost", "localhost.localdomain"}:
            if not allow_private:
                raise SSRFSecurityException(f"Access to localhost is prohibited: '{hostname}'")

        if allow_private:
            return url, "127.0.0.1"

        # Resolve DNS addresses
        try:
            addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
        except socket.gaierror as e:
            raise SSRFSecurityException(f"Failed to resolve DNS for hostname '{hostname}': {e}")

        if not addr_info:
            raise SSRFSecurityException(f"No DNS records found for hostname '{hostname}'")

        # Check all resolved IPs
        first_ip = None
        for item in addr_info:
            sockaddr = item[4]
            ip_str = sockaddr[0]
            if first_ip is None:
                first_ip = ip_str

            if cls.is_ip_prohibited(ip_str):
                raise SSRFSecurityException(
                    f"Security violation: Resolved IP '{ip_str}' for hostname '{hostname}' is in a prohibited network range"
                )

        return url, first_ip or "0.0.0.0"
