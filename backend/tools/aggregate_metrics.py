#!/usr/bin/env python3
"""
Aggregate MEASURE_* events from audit_logs and write crypto_metrics_summary.csv.

Run:
  python backend/tools/aggregate_metrics.py
"""
from pymongo import MongoClient
from dotenv import load_dotenv
import os, re, csv, statistics

load_dotenv()
MONGO_URI = os.getenv('MONGO_URI')
DBNAME = os.getenv('MONGO_DBNAME', 'zkp_demo')
if not MONGO_URI:
    print('MONGO_URI not set in .env')
    exit(1)

client = MongoClient(MONGO_URI)
db = client.get_database(DBNAME)
cursor = db.audit_logs.find({"event_type": {"$in": ["MEASURE_PROOF_SIZE","MEASURE_VERIFY_TIME","MEASURE_VAULT_ENCRYPT","MEASURE_VAULT_DECRYPT"]}})

metrics = {
    "proof_sizes": [],
    "verify_times": [],
    "vault_encrypt_times": [],
    "vault_decrypt_times": [],
    "vault_plain_bytes": []
}

for d in cursor:
    et = d.get('event_type')
    det = d.get('details','') or ''
    if et == 'MEASURE_PROOF_SIZE':
        m = re.search(r"payload_bytes=(\d+)", det)
        if m:
            metrics['proof_sizes'].append(int(m.group(1)))
    elif et == 'MEASURE_VERIFY_TIME':
        m = re.search(r"verify_ms=([0-9.]+)", det)
        if m:
            metrics['verify_times'].append(float(m.group(1)))
    elif et == 'MEASURE_VAULT_ENCRYPT':
        m = re.search(r"encrypt_ms=([0-9.]+).*plaintext_bytes=(\d+)", det)
        if m:
            metrics['vault_encrypt_times'].append(float(m.group(1)))
            metrics['vault_plain_bytes'].append(int(m.group(2)))
    elif et == 'MEASURE_VAULT_DECRYPT':
        m = re.search(r"decrypt_ms=([0-9.]+)", det)
        if m:
            metrics['vault_decrypt_times'].append(float(m.group(1)))

def summarize(arr):
    if not arr:
        return {"count": 0, "avg": None, "min": None, "max": None, "stdev": None}
    return {
        "count": len(arr),
        "avg": statistics.mean(arr),
        "min": min(arr),
        "max": max(arr),
        "stdev": statistics.pstdev(arr) if len(arr) > 1 else 0.0
    }

summary = {
    "proof_sizes": summarize(metrics['proof_sizes']),
    "verify_times_ms": summarize(metrics['verify_times']),
    "vault_encrypt_ms": summarize(metrics['vault_encrypt_times']),
    "vault_decrypt_ms": summarize(metrics['vault_decrypt_times']),
    "vault_plain_bytes": summarize(metrics['vault_plain_bytes'])
}

print("Summary:")
for k,v in summary.items():
    print(f"{k}: {v}")

csvfile = 'crypto_metrics_summary.csv'
with open(csvfile, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(["metric","count","avg","min","max","stdev"])
    for k,v in summary.items():
        writer.writerow([k, v["count"], v["avg"], v["min"], v["max"], v["stdev"]])

print(f"Wrote {csvfile}")
