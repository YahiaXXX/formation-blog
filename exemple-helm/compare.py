#!/usr/bin/env python3
"""Compares two Kubernetes YAML files field for field (order, comments and style are ignored).
Usage: python3 compare.py original.yaml rendered.yaml"""
import sys, yaml

def load(path):
    docs = {}
    for d in yaml.safe_load_all(open(path)):
        if d:
            docs[(d["kind"], d["metadata"]["name"])] = d
    return docs

def diff(a, b, path=""):
    out = []
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a: out.append(f"  only in rendered : {path}/{k} = {b[k]!r}")
            elif k not in b: out.append(f"  only in original : {path}/{k} = {a[k]!r}")
            else: out += diff(a[k], b[k], f"{path}/{k}")
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b): out.append(f"  list length differs at {path}: {len(a)} vs {len(b)}")
        for i, (x, y) in enumerate(zip(a, b)): out += diff(x, y, f"{path}[{i}]")
    elif a != b:
        out.append(f"  different at {path}: original={a!r} rendered={b!r}")
    return out

orig, rend = load(sys.argv[1]), load(sys.argv[2])
bad = 0
for key in sorted(set(orig) | set(rend)):
    if key not in rend:   print(f"MISSING in rendered : {key}"); bad += 1; continue
    if key not in orig:   print(f"EXTRA in rendered   : {key}"); bad += 1; continue
    d = diff(orig[key], rend[key])
    if d: print(f"DIFF {key[0]}/{key[1]}"); print("\n".join(d)); bad += 1
    else: print(f"same {key[0]}/{key[1]}")
print("\nIDENTICAL, field for field" if not bad else f"\n{bad} object(s) differ")
sys.exit(1 if bad else 0)
