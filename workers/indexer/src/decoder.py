"""Anchor event decoder.

Anchor (0.30+) emits events as base64 strings prefixed by 'Program data: ' in
program logs. The first 8 bytes of the decoded data are the discriminator.

The IDL stores events under `events[]` as just `{name, discriminator}`. The
actual struct fields live in `types[]` keyed by the same name.
"""
from __future__ import annotations

import base64
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import base58

log = logging.getLogger(__name__)

PROGRAM_DATA_PREFIX = "Program data: "


@dataclass(frozen=True)
class EventSpec:
    name: str
    fields: List[Dict[str, Any]]


class EventDecoder:
    """Build a discriminator → spec map from an Anchor 0.30+ IDL."""

    def __init__(self, idl_path: Path):
        idl = json.loads(idl_path.read_text())

        types_by_name: Dict[str, Dict[str, Any]] = {}
        for t in idl.get("types", []):
            types_by_name[t["name"]] = t.get("type", {})
        self._types_by_name = types_by_name

        self._specs: Dict[bytes, EventSpec] = {}
        for ev in idl.get("events", []):
            disc_arr = ev.get("discriminator")
            if not disc_arr or len(disc_arr) != 8:
                continue
            disc = bytes(disc_arr)
            ty = types_by_name.get(ev["name"]) or {}
            fields = ty.get("fields") or []
            self._specs[disc] = EventSpec(name=ev["name"], fields=fields)

        log.info("event decoder loaded %d events", len(self._specs))

    def decode_log_line(self, line: str) -> Optional[Dict[str, Any]]:
        if not line.startswith(PROGRAM_DATA_PREFIX):
            return None
        b64 = line[len(PROGRAM_DATA_PREFIX) :].strip()
        try:
            data = base64.b64decode(b64)
        except Exception:
            return None
        if len(data) < 8:
            return None
        disc, body = data[:8], data[8:]
        spec = self._specs.get(disc)
        if spec is None:
            return None
        try:
            decoded, _ = _borsh_decode_fields(body, 0, spec.fields, self._types_by_name)
        except Exception as e:
            log.warning("failed to borsh-decode %s: %s", spec.name, e)
            return None
        return {"name": spec.name, "data": decoded}


# ── Borsh decoding ──────────────────────────────────────────────────────────

def _borsh_decode_fields(
    buf: bytes,
    offset: int,
    fields: List[Dict[str, Any]],
    types_by_name: Dict[str, Dict[str, Any]],
) -> Tuple[Dict[str, Any], int]:
    out: Dict[str, Any] = {}
    for f in fields:
        ty = f["type"]
        val, used = _decode_type(buf, offset, ty, types_by_name)
        out[f["name"]] = val
        offset = used
    return out, offset


def _decode_type(
    buf: bytes,
    offset: int,
    ty: Any,
    types_by_name: Dict[str, Dict[str, Any]],
) -> Tuple[Any, int]:
    """Returns (value, new_offset)."""
    if isinstance(ty, str):
        if ty == "u8":
            return buf[offset], offset + 1
        if ty == "i8":
            return int.from_bytes(buf[offset : offset + 1], "little", signed=True), offset + 1
        if ty == "u16":
            return int.from_bytes(buf[offset : offset + 2], "little"), offset + 2
        if ty == "i16":
            return int.from_bytes(buf[offset : offset + 2], "little", signed=True), offset + 2
        if ty == "u32":
            return int.from_bytes(buf[offset : offset + 4], "little"), offset + 4
        if ty == "i32":
            return int.from_bytes(buf[offset : offset + 4], "little", signed=True), offset + 4
        if ty == "u64":
            return int.from_bytes(buf[offset : offset + 8], "little"), offset + 8
        if ty == "i64":
            return int.from_bytes(buf[offset : offset + 8], "little", signed=True), offset + 8
        if ty == "u128":
            return int.from_bytes(buf[offset : offset + 16], "little"), offset + 16
        if ty == "i128":
            return int.from_bytes(buf[offset : offset + 16], "little", signed=True), offset + 16
        if ty == "bool":
            return bool(buf[offset]), offset + 1
        if ty in ("publicKey", "pubkey"):
            return base58.b58encode(buf[offset : offset + 32]).decode(), offset + 32
        if ty == "string":
            length = int.from_bytes(buf[offset : offset + 4], "little")
            start = offset + 4
            return buf[start : start + length].decode("utf-8"), start + length
        if ty == "bytes":
            length = int.from_bytes(buf[offset : offset + 4], "little")
            start = offset + 4
            return list(buf[start : start + length]), start + length
        raise ValueError(f"unknown primitive: {ty!r}")

    if isinstance(ty, dict):
        if "defined" in ty:
            inner = ty["defined"]
            ref_name = inner["name"] if isinstance(inner, dict) else inner
            ref = types_by_name.get(ref_name)
            if ref is None:
                raise ValueError(f"unknown defined type: {ref_name!r}")
            kind = ref.get("kind")
            if kind == "struct":
                return _borsh_decode_fields(buf, offset, ref.get("fields") or [], types_by_name)
            if kind == "enum":
                tag = buf[offset]
                offset += 1
                variants = ref.get("variants") or []
                if tag >= len(variants):
                    raise ValueError(f"enum {ref_name}: invalid tag {tag}")
                v = variants[tag]
                return {v["name"]: {}}, offset
            raise ValueError(f"unsupported kind: {kind!r}")
        if "option" in ty:
            tag = buf[offset]
            offset += 1
            if tag == 0:
                return None, offset
            return _decode_type(buf, offset, ty["option"], types_by_name)
        if "vec" in ty:
            length = int.from_bytes(buf[offset : offset + 4], "little")
            offset += 4
            out: List[Any] = []
            for _ in range(length):
                val, offset = _decode_type(buf, offset, ty["vec"], types_by_name)
                out.append(val)
            return out, offset
        if "array" in ty:
            inner_ty, n = ty["array"]
            out = []
            for _ in range(n):
                val, offset = _decode_type(buf, offset, inner_ty, types_by_name)
                out.append(val)
            return out, offset
    raise ValueError(f"unsupported borsh type: {ty!r}")
