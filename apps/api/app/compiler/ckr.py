import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class CKRSection(BaseModel):
    id: str
    heading: str
    level: int = 1
    content: str
    content_hash: str


class CKRCodeSnippet(BaseModel):
    language: str
    code: str
    description: Optional[str] = None
    line_count: int


class CKRAPISymbol(BaseModel):
    name: str
    symbol_type: str = "function"
    signature: str
    description: Optional[str] = None
    is_deprecated: bool = False
    deprecation_notice: Optional[str] = None


class CKRDocument(BaseModel):
    document_id: str
    source_id: str
    canonical_url: str
    normalized_path: str
    title: str
    sections: List[CKRSection] = Field(default_factory=list)
    code_snippets: List[CKRCodeSnippet] = Field(default_factory=list)
    api_symbols: List[CKRAPISymbol] = Field(default_factory=list)
    source_version: Optional[str] = None
    content_hash: str
    extracted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def from_page_and_extracted(
        cls,
        document_id: str,
        source_id: str,
        canonical_url: str,
        normalized_path: str,
        title: str,
        sections_data: List[Dict[str, Any]],
        code_snippets_data: List[Dict[str, Any]],
        api_symbols_data: List[Dict[str, Any]],
        source_version: Optional[str] = None,
    ) -> "CKRDocument":
        sections = [CKRSection(**s) for s in sections_data]
        snippets = [CKRCodeSnippet(**c) for c in code_snippets_data]
        symbols = [CKRAPISymbol(**a) for a in api_symbols_data]

        # Calculate reproducible content hash
        hash_content = f"{title}\n{canonical_url}\n"
        for s in sections:
            hash_content += f"{s.heading}:{s.content}\n"
        for c in snippets:
            hash_content += f"{c.language}:{c.code}\n"
        doc_hash = hashlib.sha256(hash_content.encode("utf-8")).hexdigest()

        return cls(
            document_id=document_id,
            source_id=source_id,
            canonical_url=canonical_url,
            normalized_path=normalized_path,
            title=title,
            sections=sections,
            code_snippets=snippets,
            api_symbols=symbols,
            source_version=source_version,
            content_hash=doc_hash,
        )
