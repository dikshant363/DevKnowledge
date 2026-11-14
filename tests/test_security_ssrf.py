import pytest
from apps.api.app.security.ssrf import SSRFValidator, SSRFSecurityException


def test_prohibited_ips():
    # Loopback
    assert SSRFValidator.is_ip_prohibited("127.0.0.1") is True
    assert SSRFValidator.is_ip_prohibited("127.0.1.5") is True
    assert SSRFValidator.is_ip_prohibited("::1") is True

    # RFC 1918 Private ranges
    assert SSRFValidator.is_ip_prohibited("10.0.0.1") is True
    assert SSRFValidator.is_ip_prohibited("172.16.0.1") is True
    assert SSRFValidator.is_ip_prohibited("172.31.255.255") is True
    assert SSRFValidator.is_ip_prohibited("192.168.1.1") is True
    assert SSRFValidator.is_ip_prohibited("192.168.0.100") is True

    # Link-local and Cloud metadata
    assert SSRFValidator.is_ip_prohibited("169.254.169.254") is True
    assert SSRFValidator.is_ip_prohibited("169.254.1.1") is True
    assert SSRFValidator.is_ip_prohibited("fe80::1") is True

    # Public IP addresses
    assert SSRFValidator.is_ip_prohibited("8.8.8.8") is False
    assert SSRFValidator.is_ip_prohibited("1.1.1.1") is False


def test_prohibited_schemes():
    with pytest.raises(SSRFSecurityException, match="Prohibited URL scheme"):
        SSRFValidator.validate_url("file:///etc/passwd")

    with pytest.raises(SSRFSecurityException, match="Prohibited URL scheme"):
        SSRFValidator.validate_url("ftp://example.com/file.txt")

    with pytest.raises(SSRFSecurityException, match="Prohibited URL scheme"):
        SSRFValidator.validate_url("gopher://127.0.0.1:70")


def test_localhost_blocked():
    with pytest.raises(SSRFSecurityException, match="Access to localhost is prohibited"):
        SSRFValidator.validate_url("http://localhost:8000/api")

    with pytest.raises(SSRFSecurityException, match="Access to localhost is prohibited"):
        SSRFValidator.validate_url("https://localhost.localdomain/")


def test_valid_public_domain():
    # Valid domain should resolve and pass without exception
    url, ip = SSRFValidator.validate_url("https://example.com")
    assert url == "https://example.com"
    assert ip is not None
    assert SSRFValidator.is_ip_prohibited(ip) is False
