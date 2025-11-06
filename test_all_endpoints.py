#!/usr/bin/env python3
"""Comprehensive test script for all Bettit API endpoints"""

import requests
import json
import sys

API_BASE = "http://localhost:5002"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_test(name):
    print(f"\n{Colors.BLUE}{Colors.BOLD}Testing: {name}{Colors.ENDC}")

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.ENDC}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.ENDC}")

# Global token storage
TOKEN = None
USER_ID = None
MARKET_ID = None

def test_health():
    """Test health endpoint"""
    print_test("Health Check")
    try:
        resp = requests.get(f"{API_BASE}/api/health")
        data = resp.json()
        if resp.status_code == 200 and data['status'] == 'healthy':
            print_success(f"Health check passed: {data}")
            return True
        else:
            print_error(f"Health check failed: {data}")
            return False
    except Exception as e:
        print_error(f"Health check exception: {e}")
        return False

def test_register():
    """Test user registration"""
    global TOKEN, USER_ID
    print_test("User Registration")
    try:
        resp = requests.post(f"{API_BASE}/api/auth/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
            "display_name": "Test User"
        })
        data = resp.json()
        if resp.status_code == 201 and data['success']:
            TOKEN = data['user']['token']
            USER_ID = data['user']['id']
            print_success(f"User registered: {data['user']['username']}")
            print_success(f"Starting balance: ${data['user']['balance']}")
            return True
        else:
            print_error(f"Registration failed: {data}")
            return False
    except Exception as e:
        print_error(f"Registration exception: {e}")
        return False

def test_login():
    """Test user login"""
    global TOKEN
    print_test("User Login")
    try:
        resp = requests.post(f"{API_BASE}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        data = resp.json()
        if resp.status_code == 200 and data['success']:
            TOKEN = data['user']['token']
            print_success(f"Login successful for: {data['user']['username']}")
            return True
        else:
            print_error(f"Login failed: {data}")
            return False
    except Exception as e:
        print_error(f"Login exception: {e}")
        return False

def test_validate_token():
    """Test token validation"""
    print_test("Token Validation")
    try:
        resp = requests.post(f"{API_BASE}/api/auth/validate", json={
            "token": TOKEN
        })
        data = resp.json()
        if resp.status_code == 200 and data['valid']:
            print_success(f"Token is valid for user: {data['user']['username']}")
            return True
        else:
            print_error(f"Token validation failed: {data}")
            return False
    except Exception as e:
        print_error(f"Token validation exception: {e}")
        return False

def test_get_me():
    """Test get current user"""
    print_test("Get Current User")
    try:
        resp = requests.get(f"{API_BASE}/api/auth/me", headers={
            "Authorization": f"Bearer {TOKEN}"
        })
        data = resp.json()
        if resp.status_code == 200:
            print_success(f"User: {data['user']['username']} | Balance: ${data['user']['balance']}")
            return True
        else:
            print_error(f"Get user failed: {data}")
            return False
    except Exception as e:
        print_error(f"Get user exception: {e}")
        return False

def test_create_market():
    """Test market creation"""
    global MARKET_ID
    print_test("Market Creation")
    try:
        resp = requests.post(f"{API_BASE}/api/markets",
            headers={"Authorization": f"Bearer {TOKEN}"},
            json={
                "question": "Will Bitcoin reach $100,000 by end of 2025?",
                "description": "This market resolves YES if Bitcoin price reaches or exceeds $100,000 USD on any major exchange.",
                "resolution_criteria": "Market resolves YES if Bitcoin trades at or above $100,000 on Coinbase, Binance, or Kraken before Dec 31, 2025.",
                "resolution_hours": 48,
                "community": "crypto"
            })
        data = resp.json()
        if resp.status_code == 201 and data['success']:
            MARKET_ID = data['market']['id']
            print_success(f"Market created: {data['market']['question']}")
            print_success(f"Market ID: {MARKET_ID}")
            print_success(f"Initial odds: YES={data['market']['yes_odds']}, NO={data['market']['no_odds']}")
            return True
        else:
            print_error(f"Market creation failed: {data}")
            return False
    except Exception as e:
        print_error(f"Market creation exception: {e}")
        return False

def test_list_markets():
    """Test listing markets"""
    print_test("List Markets")
    try:
        resp = requests.get(f"{API_BASE}/api/markets?status=open&limit=10")
        data = resp.json()
        if resp.status_code == 200:
            print_success(f"Found {data['count']} open markets")
            for market in data['markets']:
                print(f"  - {market['question']} (ID: {market['id'][:8]}...)")
            return True
        else:
            print_error(f"List markets failed: {data}")
            return False
    except Exception as e:
        print_error(f"List markets exception: {e}")
        return False

def test_get_market():
    """Test getting specific market"""
    print_test("Get Specific Market")
    try:
        resp = requests.get(f"{API_BASE}/api/markets/{MARKET_ID}")
        data = resp.json()
        if resp.status_code == 200:
            market = data['market']
            print_success(f"Market: {market['question']}")
            print_success(f"Status: {market['status']} | Pool: ${market['total_pool']}")
            return True
        else:
            print_error(f"Get market failed: {data}")
            return False
    except Exception as e:
        print_error(f"Get market exception: {e}")
        return False

def test_simulate_bet():
    """Test bet simulation"""
    print_test("Bet Simulation")
    try:
        resp = requests.post(f"{API_BASE}/api/bets/simulate",
            headers={"Authorization": f"Bearer {TOKEN}"},
            json={
                "market_id": MARKET_ID,
                "outcome": "YES",
                "amount": 100
            })
        data = resp.json()
        if resp.status_code == 200 and data['success']:
            sim = data['simulation']
            print_success(f"$100 bet on YES would give:")
            print_success(f"  - Shares: {sim['shares']:.2f}")
            print_success(f"  - Effective price: ${sim['effective_price']:.2f}")
            print_success(f"  - Potential payout: ${sim['potential_payout']:.2f}")
            print_success(f"  - New odds: YES={sim['new_odds']['YES']:.2%}, NO={sim['new_odds']['NO']:.2%}")
            return True
        else:
            print_error(f"Bet simulation failed: {data}")
            return False
    except Exception as e:
        print_error(f"Bet simulation exception: {e}")
        return False

def test_place_bet():
    """Test placing a bet"""
    print_test("Place Bet")
    try:
        resp = requests.post(f"{API_BASE}/api/bets/place",
            headers={"Authorization": f"Bearer {TOKEN}"},
            json={
                "market_id": MARKET_ID,
                "outcome": "YES",
                "amount": 100
            })
        data = resp.json()
        if resp.status_code == 201 and data['success']:
            print_success(f"Bet placed: {data['message']}")
            print_success(f"New balance: ${data['new_balance']}")
            print_success(f"New market odds: YES={data['new_odds']['YES']:.2%}, NO={data['new_odds']['NO']:.2%}")
            return True
        else:
            print_error(f"Place bet failed: {data}")
            return False
    except Exception as e:
        print_error(f"Place bet exception: {e}")
        return False

def test_my_bets():
    """Test getting user's bets"""
    print_test("Get My Bets")
    try:
        resp = requests.get(f"{API_BASE}/api/bets/my-bets?limit=10",
            headers={"Authorization": f"Bearer {TOKEN}"})
        data = resp.json()
        if resp.status_code == 200:
            print_success(f"Found {data['count']} active bets")
            for bet in data['bets']:
                print(f"  - {bet['outcome']} on '{bet['question'][:50]}...' | ${bet['amount']} → ${bet['potential_payout']}")
            return True
        else:
            print_error(f"Get bets failed: {data}")
            return False
    except Exception as e:
        print_error(f"Get bets exception: {e}")
        return False

def test_leaderboard():
    """Test leaderboard"""
    print_test("Leaderboard")
    try:
        resp = requests.get(f"{API_BASE}/api/leaderboard?limit=10")
        data = resp.json()
        if resp.status_code == 200:
            print_success(f"Top {data['count']} users:")
            for i, user in enumerate(data['leaderboard'][:5], 1):
                print(f"  {i}. {user['username']} | Balance: ${user['balance']} | Bets: {user['total_bets']}")
            return True
        else:
            print_error(f"Leaderboard failed: {data}")
            return False
    except Exception as e:
        print_error(f"Leaderboard exception: {e}")
        return False

def test_transactions():
    """Test transaction history"""
    print_test("Transaction History")
    try:
        resp = requests.get(f"{API_BASE}/api/transactions/my-history?limit=10",
            headers={"Authorization": f"Bearer {TOKEN}"})
        data = resp.json()
        if resp.status_code == 200:
            print_success(f"Found {data['count']} transactions")
            for tx in data['transactions']:
                print(f"  - {tx['type']}: ${tx['amount']} | Balance after: ${tx['balance_after']}")
            return True
        else:
            print_error(f"Get transactions failed: {data}")
            return False
    except Exception as e:
        print_error(f"Get transactions exception: {e}")
        return False

def test_market_resolution():
    """Test resolving a market"""
    print_test("Market Resolution")
    try:
        resp = requests.post(f"{API_BASE}/api/admin/markets/{MARKET_ID}/resolve",
            headers={"Authorization": f"Bearer {TOKEN}"},
            json={"outcome": "YES"})
        data = resp.json()
        if resp.status_code == 200 and data['success']:
            print_success(f"Market resolved: {data['message']}")
            print_success(f"Bets settled: {data['bets_settled']}")
            return True
        else:
            print_error(f"Market resolution failed: {data}")
            return False
    except Exception as e:
        print_error(f"Market resolution exception: {e}")
        return False

def main():
    """Run all tests"""
    print(f"{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.ENDC}")
    print(f"{Colors.BOLD}         Bettit API Comprehensive Test Suite{Colors.ENDC}")
    print(f"{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.ENDC}")

    tests = [
        ("Health Check", test_health),
        ("User Registration", test_register),
        ("User Login", test_login),
        ("Token Validation", test_validate_token),
        ("Get Current User", test_get_me),
        ("Create Market", test_create_market),
        ("List Markets", test_list_markets),
        ("Get Specific Market", test_get_market),
        ("Simulate Bet", test_simulate_bet),
        ("Place Bet", test_place_bet),
        ("Get My Bets", test_my_bets),
        ("Leaderboard", test_leaderboard),
        ("Transaction History", test_transactions),
        ("Market Resolution", test_market_resolution),
    ]

    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"Test crashed: {e}")
            results.append((name, False))

    # Print summary
    print(f"\n{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.ENDC}")
    print(f"{Colors.BOLD}                      TEST SUMMARY{Colors.ENDC}")
    print(f"{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.ENDC}")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = f"{Colors.GREEN}PASS{Colors.ENDC}" if result else f"{Colors.RED}FAIL{Colors.ENDC}"
        print(f"  {name:30s} [{status}]")

    print(f"\n{Colors.BOLD}Total: {passed}/{total} tests passed{Colors.ENDC}")
    print(f"{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.ENDC}\n")

    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
