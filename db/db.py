"""
In-memory database implementation for testing
"""
import uuid
from datetime import datetime
from decimal import Decimal

# In-memory storage
_pool_initialized = False
_markets = {}
_users = {}
_bets = {}
_transactions = {}

def init_pool(minconn=2, maxconn=10):
    """Initialize database connection pool"""
    global _pool_initialized
    _pool_initialized = True
    return True

def health_check():
    """Check database health"""
    return _pool_initialized

# ========== MARKETS ==========

def get_market_by_id(market_id):
    """Get a market by ID"""
    return _markets.get(market_id)

def list_markets(status='open', community=None, limit=50, offset=0):
    """List markets with filters"""
    markets = list(_markets.values())

    # Filter by status
    if status:
        markets = [m for m in markets if m['status'] == status]

    # Filter by community
    if community:
        markets = [m for m in markets if m.get('community') == community]

    # Sort by created_at descending
    markets.sort(key=lambda m: m['created_at'], reverse=True)

    # Apply pagination
    return markets[offset:offset+limit]

def create_market(question, description, resolution_criteria, resolution_date,
                 created_by, source_article_url=None, source_article_title=None,
                 community='general', image_url=None, market_type='article_prediction',
                 source_metadata=None):
    """Create a new market"""
    market_id = str(uuid.uuid4())

    market = {
        'id': market_id,
        'question': question,
        'description': description,
        'resolution_criteria': resolution_criteria,
        'resolution_date': datetime.fromisoformat(resolution_date.replace('Z', '+00:00')) if isinstance(resolution_date, str) else resolution_date,
        'created_by': created_by,
        'source_article_url': source_article_url,
        'source_article_title': source_article_title,
        'community': community,
        'image_url': image_url,
        'market_type': market_type,
        'source_metadata': source_metadata or {},
        'status': 'open',
        'yes_odds': 0.5,
        'no_odds': 0.5,
        'total_pool': Decimal('0'),
        'total_yes_shares': Decimal('0'),
        'total_no_shares': Decimal('0'),
        'created_at': datetime.utcnow(),
        'resolved_at': None,
        'outcome': None
    }

    _markets[market_id] = market
    return market

def update_market_odds(market_id, new_odds, new_pool, yes_shares, no_shares):
    """Update market odds after a bet"""
    market = _markets.get(market_id)
    if not market:
        return False

    market['yes_odds'] = new_odds['YES']
    market['no_odds'] = new_odds['NO']
    market['total_pool'] = Decimal(str(new_pool))
    market['total_yes_shares'] = Decimal(str(yes_shares))
    market['total_no_shares'] = Decimal(str(no_shares))

    return True

def resolve_market(market_id, outcome):
    """Resolve a market with YES or NO outcome"""
    market = _markets.get(market_id)
    if not market:
        return False

    market['status'] = 'resolved'
    market['outcome'] = outcome
    market['resolved_at'] = datetime.utcnow()

    return True

def settle_bets_for_market(market_id, outcome):
    """Settle all bets for a resolved market"""
    market_bets = [b for b in _bets.values() if b['market_id'] == market_id]

    settled_count = 0
    for bet in market_bets:
        if bet['status'] == 'active':
            bet['status'] = 'settled'
            bet['settled_at'] = datetime.utcnow()

            # If bet won, update payout
            if bet['outcome'] == outcome:
                bet['actual_payout'] = bet['potential_payout']
                # Update user balance
                user = _users.get(bet['user_id'])
                if user:
                    user['balance'] = Decimal(user['balance']) + Decimal(bet['actual_payout'])
                    user['total_winnings'] = Decimal(user['total_winnings']) + Decimal(bet['actual_payout'])
            else:
                bet['actual_payout'] = Decimal('0')

            settled_count += 1

    return settled_count

# ========== BETS ==========

def create_bet(user_id, market_id, outcome, amount, shares, odds, potential_payout):
    """Create a new bet"""
    bet_id = str(uuid.uuid4())

    bet = {
        'id': bet_id,
        'user_id': user_id,
        'market_id': market_id,
        'outcome': outcome,
        'amount': Decimal(str(amount)),
        'shares': Decimal(str(shares)),
        'odds': odds,
        'potential_payout': Decimal(str(potential_payout)),
        'status': 'active',
        'created_at': datetime.utcnow(),
        'settled_at': None,
        'actual_payout': None
    }

    _bets[bet_id] = bet
    return bet

def get_user_bets_on_market(user_id, market_id):
    """Get user's bets on a specific market"""
    return [b for b in _bets.values()
            if b['user_id'] == user_id and b['market_id'] == market_id]

def get_user_active_bets(user_id, limit=50):
    """Get user's active bets with market info"""
    user_bets = [b for b in _bets.values() if b['user_id'] == user_id]
    user_bets.sort(key=lambda b: b['created_at'], reverse=True)

    # Enrich with market info
    result = []
    for bet in user_bets[:limit]:
        market = _markets.get(bet['market_id'])
        if market:
            enriched_bet = {**bet}
            enriched_bet['question'] = market['question']
            enriched_bet['market_status'] = market['status']
            enriched_bet['resolution_date'] = market['resolution_date']
            result.append(enriched_bet)

    return result

# ========== USERS ==========

def get_user_by_id(user_id):
    """Get user by ID"""
    return _users.get(user_id)

def update_user_balance(user_id, new_balance):
    """Update user balance"""
    user = _users.get(user_id)
    if not user:
        return False

    user['balance'] = Decimal(str(new_balance))
    return True

def increment_user_total_bets(user_id):
    """Increment user's total bet count"""
    user = _users.get(user_id)
    if not user:
        return False

    user['total_bets'] += 1
    return True

def get_leaderboard(community=None, limit=100):
    """Get top users by balance"""
    users = list(_users.values())

    # Filter by community if specified (for now, ignore this filter)

    # Sort by balance descending
    users.sort(key=lambda u: u['balance'], reverse=True)

    return users[:limit]

# ========== TRANSACTIONS ==========

def create_transaction(user_id, tx_type, amount, balance_after,
                      market_id=None, bet_id=None, description=''):
    """Create a transaction record"""
    tx_id = str(uuid.uuid4())

    transaction = {
        'id': tx_id,
        'user_id': user_id,
        'type': tx_type,
        'amount': Decimal(str(amount)),
        'balance_after': Decimal(str(balance_after)),
        'market_id': market_id,
        'bet_id': bet_id,
        'description': description,
        'created_at': datetime.utcnow()
    }

    _transactions[tx_id] = transaction
    return transaction

def get_user_transactions(user_id, limit=50):
    """Get user's transaction history"""
    txs = [t for t in _transactions.values() if t['user_id'] == user_id]
    txs.sort(key=lambda t: t['created_at'], reverse=True)
    return txs[:limit]

# ========== HELPER: Add user to storage (called by auth module) ==========

def add_user(user_data):
    """Add user to storage (internal use)"""
    _users[user_data['id']] = user_data
    return user_data
