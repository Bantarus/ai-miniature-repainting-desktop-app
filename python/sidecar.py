"""Development placeholder for the packaged Python sidecar.

This module mimics the behaviour of the future PyInstaller-built executable by
initialising the inference runtime and keeping the process alive until the Tauri
application terminates. The real bundled binary will replace this script during
the packaging stage but exposes the same lifecycle expectations to the Rust
bridge.
"""

from __future__ import annotations

import signal
import sys
import time

from inference import load_runtime


def _shutdown(_signal: int, _frame: object) -> None:  # pragma: no cover - signal handler
    sys.exit(0)


def main() -> None:
    """Boot the Python runtime and block until a termination signal arrives."""

    load_runtime()

    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, _shutdown)

    print("python sidecar ready", flush=True)

    while True:
        time.sleep(1)


if __name__ == "__main__":
    main()
