#!/usr/bin/env python3
"""Trova il channel ID corretto di Loewe su YouTube."""

import sys
import json
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient

client = ApiClient()

# Cerca canale Loewe su YouTube
print("🔍 Cercando canale Loewe su YouTube...")
result = client.call_api('Youtube/search', query={
    'q': 'LOEWE official channel',
    'hl': 'en',
    'gl': 'US',
})

contents = result.get('contents', [])
print(f"Risultati: {len(contents)}")
for item in contents[:10]:
    t = item.get('type', '')
    if t == 'channel':
        ch = item.get('channel', {})
        print(f"\n📺 CANALE: {ch.get('title')}")
        print(f"   ID: {ch.get('channelId')}")
        print(f"   Subscribers: {ch.get('subscriberCountText')}")
        print(f"   Handle: {ch.get('handle')}")
    elif t == 'video':
        v = item.get('video', {})
        print(f"\n🎥 VIDEO: {v.get('title', '')[:60]}")
        print(f"   Channel: {v.get('channelTitle')}")
        print(f"   Views: {v.get('viewCountText')}")
        print(f"   VideoId: {v.get('videoId')}")

# Prova anche con URL handle
print("\n\n🔍 Cercando con handle @loewe...")
result2 = client.call_api('Youtube/get_channel_details', query={
    'id': 'https://www.youtube.com/@loewe',
    'hl': 'en',
})
print(json.dumps(result2, indent=2)[:2000])
