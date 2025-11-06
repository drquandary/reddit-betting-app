#!/usr/bin/env python3
"""Test Reddit market creation via API"""

import requests
import json
import sys

API_BASE = "http://localhost:5002"

# Test data
reddit_post = {
    "id": "test123",
    "title": "Top researchers consider leaving U.S. amid funding cuts: 'The science world is ending'",
    "url": "https://reddit.com/r/technology/comments/test123",
    "subreddit": "technology",
    "score": 1500,
    "num_comments": 171,
    "created_utc": 1730572800
}

def get_auth_token():
    """Login and get auth token"""
    response = requests.post(f"{API_BASE}/api/auth/login", json={
        "email": "test1@test.com",
        "password": "test123"
    })
    if response.status_code == 200:
        data = response.json()
        # Try different response formats
        if 'token' in data:
            return data['token']
        elif 'access_token' in data:
            return data['access_token']
        elif 'user' in data and 'token' in data['user']:
            return data['user']['token']
        else:
            print(f"   Auth response: {data}")
            return None
    else:
        print(f"   Auth failed: {response.status_code} - {response.text}")
        return None

def test_market_creation(market_type):
    """Test creating a Reddit market"""
    token = get_auth_token()
    if not token:
        print("❌ Failed to get auth token")
        return False

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    payload = {
        "reddit_post": reddit_post,
        "market_type": market_type
    }

    print(f"\n🧪 Testing {market_type.upper()} market creation...")
    print(f"   POST {API_BASE}/api/markets/reddit")
    print(f"   Payload: {json.dumps(payload, indent=2)[:200]}...")

    response = requests.post(
        f"{API_BASE}/api/markets/reddit",
        headers=headers,
        json=payload
    )

    print(f"   Status: {response.status_code}")

    if response.status_code == 201:
        market = response.json().get('market', {})
        print(f"   ✅ Market created!")
        print(f"   - ID: {market.get('id')}")
        print(f"   - Question: {market.get('question')}")
        print(f"   - Type: {market.get('market_type')}")
        print(f"   - Metadata: {json.dumps(market.get('source_metadata', {}), indent=6)}")
        return True
    else:
        print(f"   ❌ Failed: {response.text}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Testing Reddit Market Creation API")
    print("=" * 60)

    # Test all three market types
    results = {
        "popularity": test_market_creation("popularity"),
        "engagement": test_market_creation("engagement"),
        "prediction": test_market_creation("prediction")
    }

    print("\n" + "=" * 60)
    print("RESULTS:")
    for market_type, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {market_type.upper()}: {status}")
    print("=" * 60)

    sys.exit(0 if all(results.values()) else 1)
