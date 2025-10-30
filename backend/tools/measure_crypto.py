#!/usr/bin/env python3
"""
Print CSV lines with vault blob sizes and plain entries sizes for each user.
Run:
  python backend/tools/measure_crypto.py
"""
from pymongo import MongoClient
from dotenv import load_dotenv
import os, json
from bson import BSON
from bson import json_util

load_dotenv()
MONGO_URI = os.getenv('MONGO_URI')
DBNAME = os.getenv('MONGO_DBNAME', 'zkp_demo')
if not MONGO_URI:
    print('MONGO_URI not set in .env')
    exit(1)

client = MongoClient(MONGO_URI)
db = client.get_database(DBNAME)
users = db.get_collection('users')

def bson_size(doc):
    try:
        return len(BSON.encode(doc))
    except Exception:
        return len(json.dumps(doc, default=json_util.default).encode())

print("username,vault_blob_bson_bytes,vault_blob_json_bytes,plain_entries_bson_bytes")
for user in users.find():
    username = user.get('username') or user.get('username_norm') or str(user.get('_id'))
    vault_blob = user.get('vault_blob')
    plain_entries = user.get('plain_entries', [])
    vault_blob_bson = bson_size({'vault_blob': vault_blob}) if vault_blob else 0
    vault_blob_json = len(json.dumps(vault_blob or {}).encode())
    plain_entries_bson = bson_size({'plain_entries': plain_entries}) if plain_entries else 0
    print(f"{username},{vault_blob_bson},{vault_blob_json},{plain_entries_bson}")
