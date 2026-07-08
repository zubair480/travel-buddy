#!/usr/bin/env python3
"""Fetch a public event page with Scrapling and print rendered HTML to stdout."""

from __future__ import annotations

import json
import sys
from typing import Any, Callable


def call_with_supported_kwargs(func: Callable[..., Any], url: str, **kwargs: Any) -> Any:
    try:
        return func(url, **kwargs)
    except TypeError:
        return func(url)


def page_to_html(page: Any) -> str:
    for attr in ("html", "body", "content", "text"):
        value = getattr(page, attr, None)
        if callable(value):
            try:
                value = value()
            except TypeError:
                value = None
        if isinstance(value, bytes):
            return value.decode("utf-8", errors="replace")
        if isinstance(value, str) and value.strip():
            return value
    return str(page)


def fetch_with_scrapling(url: str, mode: str) -> str:
    normalized_mode = mode.lower().strip()

    if normalized_mode == "dynamic":
        from scrapling.fetchers import DynamicFetcher

        page = call_with_supported_kwargs(
            DynamicFetcher.fetch,
            url,
            headless=True,
            network_idle=True,
            disable_resources=False,
        )
        return page_to_html(page)

    if normalized_mode == "stealthy":
        from scrapling.fetchers import StealthyFetcher

        page = call_with_supported_kwargs(
            StealthyFetcher.fetch,
            url,
            headless=True,
            network_idle=True,
        )
        return page_to_html(page)

    from scrapling.fetchers import Fetcher

    page = call_with_supported_kwargs(
        Fetcher.get,
        url,
        stealthy_headers=True,
        impersonate="chrome",
    )
    return page_to_html(page)


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        url = str(payload.get("url") or "").strip()
        mode = str(payload.get("mode") or "fetcher")
        if not url:
            print("Missing URL", file=sys.stderr)
            return 64

        sys.stdout.write(fetch_with_scrapling(url, mode))
        return 0
    except ModuleNotFoundError as error:
        print(
            "Scrapling fetchers are not installed. Run: pip install 'scrapling[fetchers]' && scrapling install",
            file=sys.stderr,
        )
        print(str(error), file=sys.stderr)
        return 78
    except Exception as error:  # noqa: BLE001 - this script reports failures to the Node caller.
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
