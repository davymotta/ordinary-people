#!/usr/bin/env python3
"""
harvest-loewe-v2.py
Raccoglie post reali di Loewe da YouTube (canale ufficiale + UGC).
Salva i risultati in JSON per l'ingestion nel GTE.
"""

import sys
import json
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient

client = ApiClient()
CHANNEL_ID = 'UCIkFEXV_zvjOlmOcKEHW_hg'  # LOEWE official YouTube

all_posts = []
seen_ids = set()


def parse_views(text: str) -> int:
    """Parsa stringhe come '1.2M views' in int."""
    text = str(text).replace(' views', '').replace(',', '').strip()
    if 'M' in text:
        try:
            return int(float(text.replace('M', '')) * 1_000_000)
        except:
            return 0
    elif 'K' in text:
        try:
            return int(float(text.replace('K', '')) * 1_000)
        except:
            return 0
    try:
        return int(text)
    except:
        return 0


def add_yt_video(v: dict, content_type: str = 'video', is_official: bool = True):
    """Aggiunge un video YouTube alla lista se non già presente."""
    vid_id = v.get('videoId', '')
    if not vid_id or vid_id in seen_ids:
        return
    seen_ids.add(vid_id)
    stats = v.get('stats', {})
    thumbnails = v.get('thumbnails', [])
    views_raw = stats.get('views', 0)
    views = parse_views(str(views_raw)) if views_raw else 0
    all_posts.append({
        'platform': 'youtube',
        'external_id': vid_id,
        'url': f'https://www.youtube.com/watch?v={vid_id}',
        'title': v.get('title', '')[:200],
        'description': v.get('descriptionSnippet', ''),
        'published_at': v.get('publishedTimeText', ''),
        'metrics': {
            'views': views,
            'likes': int(stats.get('likes', 0)),
            'comments': int(stats.get('comments', 0)),
            'shares': 0,
        },
        'author': {
            'handle': v.get('channelTitle', 'LOEWE') if not is_official else 'LOEWE',
            'nickname': v.get('channelTitle', 'LOEWE') if not is_official else 'LOEWE',
            'followers': 0,
        },
        'content_type': content_type,
        'duration_seconds': int(v.get('lengthSeconds', 0)),
        'hashtags': [],
        'thumbnail': thumbnails[0].get('url', '') if thumbnails else '',
        'brand_agent_id': 1,
        'is_official': is_official,
    })


# 1. Video ufficiali dal canale
print('=' * 60)
print('LOEWE Ground Truth Harvest v2')
print('=' * 60)

for filter_type in ['videos_latest', 'shorts_latest']:
    print(f'\n📺 Canale ufficiale [{filter_type}]...')
    result = client.call_api('Youtube/get_channel_videos', query={
        'id': CHANNEL_ID,
        'filter': filter_type,
        'hl': 'en',
        'gl': 'US',
    })
    contents = result.get('contents', [])
    cursor = result.get('cursorNext', '')
    for item in contents:
        if item.get('type') == 'video':
            add_yt_video(
                item.get('video', {}),
                content_type='short' if filter_type == 'shorts_latest' else 'video',
                is_official=True
            )
    print(f'  → {len(all_posts)} post finora')

    # Paginazione
    if cursor:
        result2 = client.call_api('Youtube/get_channel_videos', query={
            'id': CHANNEL_ID,
            'filter': filter_type,
            'hl': 'en',
            'gl': 'US',
            'cursor': cursor,
        })
        for item in result2.get('contents', []):
            if item.get('type') == 'video':
                add_yt_video(
                    item.get('video', {}),
                    content_type='short' if filter_type == 'shorts_latest' else 'video',
                    is_official=True
                )
        print(f'  → {len(all_posts)} post dopo paginazione')

# 2. UGC da YouTube search
print('\n🔍 YouTube UGC search...')
ugc_queries = [
    'LOEWE bag review 2025',
    'LOEWE unboxing haul',
    'LOEWE puzzle bag review',
    'LOEWE Amazona bag',
    'LOEWE luxury fashion review',
    'LOEWE Spring Summer 2025',
]
for q in ugc_queries:
    print(f'  Searching: "{q}"...')
    result = client.call_api('Youtube/search', query={'q': q, 'hl': 'en', 'gl': 'US'})
    for item in result.get('contents', []):
        if item.get('type') == 'video':
            v = item.get('video', {})
            vid_id = v.get('videoId', '')
            if vid_id and vid_id not in seen_ids:
                seen_ids.add(vid_id)
                views = parse_views(v.get('viewCountText', '0'))
                thumbnails = v.get('thumbnails', [])
                all_posts.append({
                    'platform': 'youtube',
                    'external_id': vid_id,
                    'url': f'https://www.youtube.com/watch?v={vid_id}',
                    'title': v.get('title', '')[:200],
                    'description': v.get('descriptionSnippet', ''),
                    'published_at': v.get('publishedTimeText', ''),
                    'metrics': {
                        'views': views,
                        'likes': 0,
                        'comments': 0,
                        'shares': 0,
                    },
                    'author': {
                        'handle': v.get('channelTitle', ''),
                        'nickname': v.get('channelTitle', ''),
                        'followers': 0,
                    },
                    'content_type': 'video',
                    'duration_seconds': 0,
                    'hashtags': [],
                    'thumbnail': thumbnails[0].get('url', '') if thumbnails else '',
                    'brand_agent_id': 1,
                    'is_official': False,
                })

print(f'\n  → {len(all_posts)} post totali')

# 3. Calcola engagement rate
for p in all_posts:
    m = p['metrics']
    views = m.get('views', 0)
    if views > 0:
        eng = m.get('likes', 0) + m.get('comments', 0) * 3 + m.get('shares', 0) * 5
        p['engagement_rate'] = min(eng / views, 1.0)
    else:
        p['engagement_rate'] = 0.0

# 4. Statistiche
print('\n' + '=' * 60)
print(f'TOTALE POST UNICI: {len(all_posts)}')
print(f'  Ufficiali (LOEWE channel): {sum(1 for p in all_posts if p.get("is_official"))}')
print(f'  UGC (creator/reviewer): {sum(1 for p in all_posts if not p.get("is_official"))}')
print(f'  Video: {sum(1 for p in all_posts if p["content_type"] == "video")}')
print(f'  Short: {sum(1 for p in all_posts if p["content_type"] == "short")}')

views_list = [p['metrics']['views'] for p in all_posts if p['metrics']['views'] > 0]
if views_list:
    print(f'\nViews (solo post con dati):')
    print(f'  Min: {min(views_list):,}')
    print(f'  Max: {max(views_list):,}')
    print(f'  Media: {int(sum(views_list)/len(views_list)):,}')
    print(f'  Post con views > 0: {len(views_list)}/{len(all_posts)}')

# 5. Top 10 per views
sorted_posts = sorted(all_posts, key=lambda p: p['metrics']['views'], reverse=True)
print(f'\n🏆 Top 10 per views:')
for i, p in enumerate(sorted_posts[:10], 1):
    flag = '✓' if p['is_official'] else '·'
    print(f'  {i}. [{flag}] {p["title"][:55]}...')
    print(f'     Views: {p["metrics"]["views"]:,} | ER: {p["engagement_rate"]:.4f} | {p["content_type"]}')

# 6. Salva
output = {
    'brand': 'Loewe',
    'brand_agent_id': 1,
    'harvested_at': '2026-03-22',
    'channel_id': CHANNEL_ID,
    'total_posts': len(all_posts),
    'stats': {
        'official': sum(1 for p in all_posts if p.get('is_official')),
        'ugc': sum(1 for p in all_posts if not p.get('is_official')),
        'with_views': len(views_list),
        'avg_views': int(sum(views_list)/len(views_list)) if views_list else 0,
        'max_views': max(views_list) if views_list else 0,
    },
    'posts': all_posts,
}
output_path = '/home/ubuntu/ordinary-people/scripts/loewe-harvest.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print(f'\n✅ Salvato in: {output_path}')
