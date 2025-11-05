#!/usr/bin/env python3
"""
NewsBadger Web Search Backend API
Uses real web search to power the app's search functionality
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import urllib.parse
import hashlib

app = Flask(__name__)
CORS(app)  # Enable CORS for browser requests

def search_google_news(query, max_results=10):
    """
    Search Google News and scrape results
    """
    articles = []

    try:
        # URL encode the query
        encoded_query = urllib.parse.quote(query)
        url = f"https://news.google.com/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"

        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }

        print(f"[WebSearch] Fetching: {url}")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all article elements in Google News
        article_elements = soup.find_all('article')

        for idx, article in enumerate(article_elements[:max_results]):
            try:
                # Find the first link with substantial text (the title)
                links = article.find_all('a')
                title = None
                link = None

                for a in links:
                    text = a.get_text(strip=True)
                    if text and len(text) > 10:  # Title should be substantial
                        title = text
                        link = a.get('href', '')
                        break

                if not title or not link:
                    continue

                # Convert relative URL to absolute
                if link.startswith('./'):
                    link = 'https://news.google.com' + link[1:]

                # Extract source (try to find it after the title link)
                source = 'Google News'
                all_text = article.get_text()
                # Look for common news sources
                for possible_source in ['CNN', 'BBC', 'Reuters', 'AP', 'Bloomberg', 'WSJ', 'NYT']:
                    if possible_source in all_text:
                        source = possible_source
                        break

                # Extract time
                time_elem = article.find('time')
                published_at = datetime.now().isoformat()
                if time_elem and time_elem.get('datetime'):
                    published_at = time_elem.get('datetime')

                # Generate unique ID from URL
                article_id = 'web_' + hashlib.md5(link.encode()).hexdigest()[:12]

                articles.append({
                    'id': article_id,
                    'title': title,
                    'summary': f'News article about {query}',
                    'content': title,  # Google News doesn't provide content in search results
                    'url': link,
                    'source': source,
                    'topic': 'general',
                    'publishedAt': published_at,
                    'readTime': 3,
                    'image': f'https://via.placeholder.com/600x250/6366f1/ffffff?text=News'
                })

                print(f"  ✓ Found: {title[:60]}...")

            except Exception as e:
                print(f"  ✗ Error parsing article: {e}")
                continue

        print(f"[WebSearch] Found {len(articles)} articles")

    except Exception as e:
        print(f"[ERROR] Failed to search Google News: {e}")

    return articles

@app.route('/api/search', methods=['POST'])
def search_news():
    """
    Search the web for news articles

    Request body:
    {
        "query": "search query string",
        "max_results": 10
    }
    """
    try:
        data = request.json
        query = data.get('query', '')
        max_results = data.get('max_results', 10)

        if not query:
            return jsonify({'error': 'Query parameter is required'}), 400

        print(f"[WebSearch] Searching for: {query}")

        # Perform actual web search
        articles = search_google_news(query, max_results)

        results = {
            'query': query,
            'articles': articles,
            'total_results': len(articles)
        }

        return jsonify(results)

    except Exception as e:
        print(f"[ERROR] Search failed: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/explore', methods=['POST'])
def explore_topic():
    """
    Explore a topic and find related articles

    Request body:
    {
        "title": "article title",
        "content": "article content",
        "search_terms": ["term1", "term2"]
    }
    """
    try:
        data = request.json
        title = data.get('title', '')
        search_terms = data.get('search_terms', [])

        # Build search query from title and search terms
        query = f"{title} {' '.join(search_terms[:3])}"

        print(f"[WebSearch] Exploring topic: {query}")

        # Perform actual web search
        articles = search_google_news(query, max_results=20)

        results = {
            'query': query,
            'articles': articles,
            'total_results': len(articles)
        }

        return jsonify(results)

    except Exception as e:
        print(f"[ERROR] Explore failed: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'NewsBadger WebSearch API is running',
        'features': ['web_search', 'explore_topics']
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"""
╔═══════════════════════════════════════════════════════════╗
║          NewsBadger WebSearch Backend API                 ║
╠═══════════════════════════════════════════════════════════╣
║  Status: Running                                           ║
║  Port: {port}                                             ║
║  Endpoints:                                                ║
║    - POST /api/search     (Search web for news)           ║
║    - POST /api/explore    (Explore related articles)      ║
║    - GET  /api/health     (Health check)                  ║
║                                                            ║
║  Update app.js API_BASE_URL to:                           ║
║    http://localhost:{port}                                ║
╚═══════════════════════════════════════════════════════════╝
    """)

    app.run(host='0.0.0.0', port=port, debug=True)
