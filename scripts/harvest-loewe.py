#!/usr/bin/env python3
"""
harvest-loewe.py
Raccoglie post reali di Loewe da TikTok e YouTube.
Salva i risultati in JSON per l'ingestion nel GTE.
"""

import sys
import json
import os
from typing import Dict, Any, List, Optional

sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient

client = ApiClient()

def search_tiktok_loewe(keyword: str = "loewe", max_posts: int = 20) -> List[Dict]:
    """Cerca video TikTok di Loewe."""
    print(f"\n🎵 TikTok search: '{keyword}'...")
    try:
        result = client.call_api('Tiktok/search_tiktok_video_general', query={'keyword': keyword})
        videos = result.get('data', [])
        print(f"  → {len(videos)} video trovati")
        posts = []
        for v in videos[:max_posts]:
            stats = v.get('statistics', {})
            author = v.get('author', {})
            music = v.get('music', {})
            video_data = v.get('video', {})
            post = {
                'platform': 'tiktok',
                'external_id': v.get('aweme_id', ''),
                'url': f"https://www.tiktok.com/@{author.get('unique_id', 'loewe')}/video/{v.get('aweme_id', '')}",
                'title': v.get('desc', '')[:200],
                'description': v.get('desc', ''),
                'published_at': str(v.get('create_time', '')),
                'metrics': {
                    'views': int(stats.get('play_count', 0)),
                    'likes': int(stats.get('digg_count', 0)),
                    'comments': int(stats.get('comment_count', 0)),
                    'shares': int(stats.get('share_count', 0)),
                    'saves': int(stats.get('collect_count', 0)),
                },
                'author': {
                    'handle': author.get('unique_id', ''),
                    'nickname': author.get('nickname', ''),
                    'followers': author.get('follower_count', 0),
                },
                'content_type': 'video',
                'duration_seconds': video_data.get('duration', 0),
                'hashtags': [tag.get('hashtag_name', '') for tag in v.get('text_extra', []) if tag.get('hashtag_name')],
                'music': music.get('title', ''),
                'brand_agent_id': 1,  # Loewe
            }
            posts.append(post)
        return posts
    except Exception as e:
        print(f"  ❌ Errore TikTok: {e}")
        return []


def get_youtube_loewe(channel_id: str = "UCF_NVFJjGCFHzaJWMNMRBqg", max_videos: int = 20) -> List[Dict]:
    """Raccoglie video dal canale YouTube di Loewe."""
    print(f"\n📺 YouTube channel: {channel_id}...")
    try:
        result = client.call_api('Youtube/get_channel_videos', query={
            'id': channel_id,
            'filter': 'videos_latest',
            'hl': 'en',
            'gl': 'US',
        })
        contents = result.get('contents', [])
        print(f"  → {len(contents)} video trovati")
        posts = []
        for item in contents[:max_videos]:
            if item.get('type') != 'video':
                continue
            v = item.get('video', {})
            stats = v.get('stats', {})
            thumbnails = v.get('thumbnails', [])
            post = {
                'platform': 'youtube',
                'external_id': v.get('videoId', ''),
                'url': f"https://www.youtube.com/watch?v={v.get('videoId', '')}",
                'title': v.get('title', '')[:200],
                'description': v.get('descriptionSnippet', ''),
                'published_at': v.get('publishedTimeText', ''),
                'metrics': {
                    'views': int(stats.get('views', 0)),
                    'likes': int(stats.get('likes', 0)),
                    'comments': int(stats.get('comments', 0)),
                    'shares': 0,
                },
                'author': {
                    'handle': 'LOEWE',
                    'nickname': 'LOEWE',
                    'followers': 0,
                },
                'content_type': 'video',
                'duration_seconds': int(v.get('lengthSeconds', 0)),
                'hashtags': [],
                'thumbnail': thumbnails[0].get('url', '') if thumbnails else '',
                'brand_agent_id': 1,  # Loewe
            }
            posts.append(post)
        return posts
    except Exception as e:
        print(f"  ❌ Errore YouTube: {e}")
        return []


def get_youtube_loewe_search() -> List[Dict]:
    """Cerca video Loewe su YouTube via search."""
    print(f"\n🔍 YouTube search: 'Loewe fashion'...")
    try:
        result = client.call_api('Youtube/search', query={
            'q': 'Loewe fashion bag',
            'hl': 'en',
            'gl': 'US',
        })
        contents = result.get('contents', [])
        print(f"  → {len(contents)} risultati trovati")
        posts = []
        for item in contents[:15]:
            if item.get('type') != 'video':
                continue
            v = item.get('video', {})
            thumbnails = v.get('thumbnails', [])
            post = {
                'platform': 'youtube',
                'external_id': v.get('videoId', ''),
                'url': f"https://www.youtube.com/watch?v={v.get('videoId', '')}",
                'title': v.get('title', '')[:200],
                'description': v.get('descriptionSnippet', ''),
                'published_at': v.get('publishedTimeText', ''),
                'metrics': {
                    'views': _parse_views(v.get('viewCountText', '0')),
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
            }
            posts.append(post)
        return posts
    except Exception as e:
        print(f"  ❌ Errore YouTube search: {e}")
        return []


def _parse_views(text: str) -> int:
    """Parsa stringhe come '1.2M views' in int."""
    text = text.replace(' views', '').replace(',', '').strip()
    if 'M' in text:
        return int(float(text.replace('M', '')) * 1_000_000)
    elif 'K' in text:
        return int(float(text.replace('K', '')) * 1_000)
    try:
        return int(text)
    except:
        return 0


def compute_engagement_rate(metrics: Dict) -> float:
    """Calcola l'engagement rate normalizzato."""
    views = metrics.get('views', 0)
    if views == 0:
        return 0.0
    engagements = (
        metrics.get('likes', 0) +
        metrics.get('comments', 0) * 3 +  # commenti valgono di più
        metrics.get('shares', 0) * 5 +    # share valgono molto di più
        metrics.get('saves', 0) * 2
    )
    return min(engagements / views, 1.0)


def main():
    print("=" * 60)
    print("🔍 LOEWE Ground Truth Harvest")
    print("=" * 60)

    all_posts = []

    # 1. TikTok: keyword "loewe"
    tiktok_loewe = search_tiktok_loewe("loewe", max_posts=20)
    all_posts.extend(tiktok_loewe)

    # 2. TikTok: keyword "loewe bag"
    tiktok_bag = search_tiktok_loewe("loewe bag", max_posts=10)
    all_posts.extend(tiktok_bag)

    # 3. TikTok: keyword "loewe puzzle bag"
    tiktok_puzzle = search_tiktok_loewe("loewe puzzle bag", max_posts=10)
    all_posts.extend(tiktok_puzzle)

    # 4. YouTube: canale ufficiale
    yt_channel = get_youtube_loewe(max_videos=20)
    all_posts.extend(yt_channel)

    # 5. YouTube: search
    yt_search = get_youtube_loewe_search()
    all_posts.extend(yt_search)

    # Deduplica per external_id
    seen = set()
    unique_posts = []
    for p in all_posts:
        key = f"{p['platform']}_{p['external_id']}"
        if key not in seen and p['external_id']:
            seen.add(key)
            # Aggiungi engagement rate
            p['engagement_rate'] = compute_engagement_rate(p['metrics'])
            unique_posts.append(p)

    print(f"\n{'=' * 60}")
    print(f"📊 TOTALE POST UNICI: {len(unique_posts)}")
    print(f"  TikTok: {sum(1 for p in unique_posts if p['platform'] == 'tiktok')}")
    print(f"  YouTube: {sum(1 for p in unique_posts if p['platform'] == 'youtube')}")

    # Statistiche engagement
    if unique_posts:
        views_list = [p['metrics']['views'] for p in unique_posts if p['metrics']['views'] > 0]
        if views_list:
            print(f"\n📈 Statistiche views:")
            print(f"  Min: {min(views_list):,}")
            print(f"  Max: {max(views_list):,}")
            print(f"  Media: {int(sum(views_list)/len(views_list)):,}")

        er_list = [p['engagement_rate'] for p in unique_posts if p['engagement_rate'] > 0]
        if er_list:
            print(f"\n💬 Engagement rate:")
            print(f"  Min: {min(er_list):.4f}")
            print(f"  Max: {max(er_list):.4f}")
            print(f"  Media: {sum(er_list)/len(er_list):.4f}")

    # Salva in JSON
    output_path = "/home/ubuntu/ordinary-people/scripts/loewe-harvest.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            'brand': 'Loewe',
            'brand_agent_id': 1,
            'harvested_at': '2026-03-22',
            'total_posts': len(unique_posts),
            'posts': unique_posts,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Salvato in: {output_path}")
    print(f"   {len(unique_posts)} post pronti per l'ingestion nel GTE")

    # Mostra i top 5 post per views
    sorted_posts = sorted(unique_posts, key=lambda p: p['metrics']['views'], reverse=True)
    print(f"\n🏆 Top 5 post per views:")
    for i, p in enumerate(sorted_posts[:5], 1):
        print(f"  {i}. [{p['platform'].upper()}] {p['title'][:60]}...")
        print(f"     Views: {p['metrics']['views']:,} | ER: {p['engagement_rate']:.4f}")
        print(f"     URL: {p['url']}")


if __name__ == "__main__":
    main()
