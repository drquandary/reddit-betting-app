#!/usr/bin/env python3
"""
Bettit API Backend
Handles markets, betting, authentication, and social features
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import logging
import requests
from bs4 import BeautifulSoup
import urllib.parse
import hashlib
import praw
import re
from collections import Counter
from openai import OpenAI

# Import our modules
from db.db import (
    init_pool, health_check,
    get_market_by_id, list_markets, create_market, update_market_odds,
    resolve_market, settle_bets_for_market,
    create_bet, get_user_bets_on_market, get_user_active_bets,
    get_user_by_id, update_user_balance, increment_user_total_bets,
    create_transaction, get_user_transactions,
    get_leaderboard
)
from db.auth import (
    register_user, login_user, validate_token,
    require_auth, get_current_user
)
from db.market_maker import MarketMaker, restore_market

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app - serve static files from current directory
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # Enable CORS for browser requests

# Initialize database pool immediately
success = init_pool(minconn=2, maxconn=10)
if not success:
    logger.error("Failed to initialize database pool!")
else:
    logger.info("✅ Bettit API initialized successfully")

# ========== OPENAI CLIENT ==========
# Initialize OpenAI client (uses OpenAI proxy at localhost:8081 if available)
OPENAI_BASE_URL = os.getenv('OPENAI_BASE_URL', 'http://localhost:8081/v1')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', 'sk-proxy-key')  # Proxy doesn't need real key

try:
    openai_client = OpenAI(
        base_url=OPENAI_BASE_URL,
        api_key=OPENAI_API_KEY
    )
    logger.info(f"✅ OpenAI client initialized (base_url: {OPENAI_BASE_URL})")
except Exception as e:
    logger.warning(f"⚠️ OpenAI client initialization failed: {e}")
    openai_client = None


# ========== MODAL ANALYZER ==========
class ModalAnalyzer:
    """Detects Latourian modes in Reddit posts and comments"""

    # Modal signal patterns - these detect mode presence in text
    PATTERNS = {
        'NET': [
            r'\b(viral|trending|everyone is talking|spreading|shared)\b',
            r'\b(upvotes|awards|front page|popular)\b',
            r'\b(X said|according to Twitter|going around)\b',
            r'\b(people are saying|word is|buzz)\b',
            r'\b(blowing up|taking over|everywhere)\b'
        ],
        'REF': [
            r'\b(source|citation|study shows|research|data|evidence)\b',
            r'\b(fact check|verified|confirmed|peer reviewed)\b',
            r'\[.*?\]\(http',  # markdown links
            r'\b(according to experts|scientists say|studies show)\b',
            r'\b(published|journal|paper|findings)\b',
            r'\b(documented|proven|established)\b'
        ],
        'POL': [
            r'\b(power|system|structure|institution|establishment)\b',
            r'\b(policy|government|political|congress|administration)\b',
            r'\b(we need to|should be|must change|reform)\b',
            r'\b(systemic|structural|hierarchical)\b',
            r'\b(agenda|manipulation|control)\b'
        ],
        'MOR': [
            r'\b(harm|victim|suffering|injustice|wrong|right thing)\b',
            r'\b(ethical|immoral|should|shouldn\'t|obligation)\b',
            r'\b(care about|empathy|compassion|cruelty)\b',
            r'\b(values|principles|integrity|dignity)\b',
            r'\b(responsibility|accountability)\b'
        ],
        'LAW': [
            r'\b(legal|illegal|law|court|accountability|consequences)\b',
            r'\b(prosecute|sue|justice system|regulation)\b',
            r'\b(rights|constitution|lawsuit|criminal)\b',
            r'\b(enforce|violate|comply|statute)\b'
        ]
    }

    def analyze_text(self, text):
        """Returns modal scores for a piece of text"""
        if not text:
            return {}

        scores = {}
        text_lower = text.lower()

        for mode, patterns in self.PATTERNS.items():
            score = 0
            for pattern in patterns:
                matches = re.findall(pattern, text_lower)
                score += len(matches)
            scores[mode] = score

        return scores

    def get_dominant_mode(self, text):
        """Returns the dominant mode for a piece of text"""
        scores = self.analyze_text(text)
        if not scores or sum(scores.values()) == 0:
            return None
        return max(scores, key=scores.get)

    def analyze_thread(self, post_data, comments_data):
        """
        Analyzes modal pathway through a Reddit thread

        Args:
            post_data: dict with 'title' and 'body'
            comments_data: list of dicts with 'body' and 'created' timestamp

        Returns:
            dict with modal analysis
        """
        # Analyze post
        post_text = f"{post_data['title']} {post_data.get('body', '')}"
        post_modes = self.analyze_text(post_text)
        post_dominant = self.get_dominant_mode(post_text)

        # Analyze comments in chronological order
        comment_sequence = []
        sorted_comments = sorted(comments_data, key=lambda c: c['created'])[:15]

        for comment in sorted_comments:
            dominant = self.get_dominant_mode(comment['body'])
            if dominant:
                comment_sequence.append(dominant)

        # Calculate pathway (most common 3-mode sequence)
        pathway = self._extract_pathway(comment_sequence)

        # Calculate complexity (unique modes used)
        all_modes = [post_dominant] + comment_sequence if post_dominant else comment_sequence
        complexity = len(set(all_modes))

        # Count mode frequencies
        mode_counts = Counter(all_modes)
        overall_dominant = mode_counts.most_common(1)[0][0] if mode_counts else None

        return {
            'post_modes': post_modes,
            'post_dominant': post_dominant,
            'dominant_mode': overall_dominant,
            'pathway': pathway,
            'complexity': complexity,
            'sequence': comment_sequence[:5],  # first 5 transitions
            'mode_distribution': dict(mode_counts)
        }

    def _extract_pathway(self, sequence):
        """Extracts most common modal transition pattern"""
        if len(sequence) < 3:
            if len(sequence) == 2:
                return f"{sequence[0]} → {sequence[1]}"
            elif len(sequence) == 1:
                return sequence[0]
            return None

        # Find most common 3-mode sequence
        transitions = []
        for i in range(len(sequence) - 2):
            triple = f"{sequence[i]} → {sequence[i+1]} → {sequence[i+2]}"
            transitions.append(triple)

        if transitions:
            most_common = Counter(transitions).most_common(1)[0]
            return most_common[0]

        # Fallback to first 3 modes
        return f"{sequence[0]} → {sequence[1]} → {sequence[2]}"

    def calculate_modal_score(self, text):
        """Returns normalized modal scores (0-1 range)"""
        scores = self.analyze_text(text)
        total = sum(scores.values())
        if total == 0:
            return scores
        return {mode: score/total for mode, score in scores.items()}


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

        logger.info(f"[WebSearch] Fetching: {url}")
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

                # Analyze modal signature
                analyzer = ModalAnalyzer()
                modal_scores = analyzer.analyze_text(title)
                dominant_mode = analyzer.get_dominant_mode(title)

                article_obj = {
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
                }

                # Add modal signature if detected
                if dominant_mode:
                    article_obj['modal_signature'] = {
                        'dominant': dominant_mode,
                        'post_dominant': dominant_mode,
                        'pathway': dominant_mode,
                        'complexity': len([s for s in modal_scores.values() if s > 0]),
                        'sequence': [dominant_mode],
                        'distribution': {dominant_mode: modal_scores.get(dominant_mode, 0)}
                    }

                articles.append(article_obj)

                logger.info(f"  ✓ Found: {title[:60]}... [{dominant_mode or 'N/A'}]")

            except Exception as e:
                logger.warning(f"  ✗ Error parsing article: {e}")
                continue

        logger.info(f"[WebSearch] Found {len(articles)} articles")

    except Exception as e:
        logger.error(f"[ERROR] Failed to search Google News: {e}")

    return articles


# ========== HEALTH & STATUS ==========

@app.route('/api/health', methods=['GET'])
def api_health():
    """Health check endpoint"""
    db_healthy = health_check()
    return jsonify({
        'status': 'healthy' if db_healthy else 'unhealthy',
        'database': 'connected' if db_healthy else 'disconnected',
        'timestamp': datetime.utcnow().isoformat()
    }), 200 if db_healthy else 503

@app.route('/api/status', methods=['GET'])
def api_status():
    """Get API status and statistics"""
    try:
        markets = list_markets(status='open', limit=1)
        users = get_leaderboard(limit=1)

        return jsonify({
            'status': 'ok',
            'version': '1.0.0',
            'features': ['markets', 'betting', 'auth', 'social'],
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Status error: {e}")
        return jsonify({'error': 'Failed to get status'}), 500

# ========== AUTHENTICATION ==========

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    """Register a new user"""
    try:
        data = request.json
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        display_name = data.get('display_name')

        if not all([username, email, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        success, user_data, error = register_user(username, email, password, display_name)

        if not success:
            return jsonify({'error': error}), 400

        return jsonify({
            'success': True,
            'user': user_data,
            'message': 'Registration successful'
        }), 201

    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Login and get JWT token"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        if not all([email, password]):
            return jsonify({'error': 'Email and password required'}), 400

        success, user_data, error = login_user(email, password)

        if not success:
            return jsonify({'error': error}), 401

        return jsonify({
            'success': True,
            'user': user_data,
            'message': 'Login successful'
        }), 200

    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/auth/validate', methods=['POST'])
def auth_validate():
    """Validate a JWT token"""
    try:
        data = request.json
        token = data.get('token')

        if not token:
            return jsonify({'error': 'Token required'}), 400

        valid, user_data, error = validate_token(token)

        if not valid:
            return jsonify({'error': error, 'valid': False}), 401

        return jsonify({
            'valid': True,
            'user': user_data
        }), 200

    except Exception as e:
        logger.error(f"Validation error: {e}")
        return jsonify({'error': 'Validation failed', 'valid': False}), 500

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def auth_me():
    """Get current user profile"""
    try:
        user = get_current_user()
        return jsonify({
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'display_name': user['display_name'],
                'balance': float(user['balance']),
                'total_bets': user['total_bets'],
                'total_winnings': float(user['total_winnings']),
                'win_rate': float(user['win_rate']),
                'is_creator': user['is_creator']
            }
        }), 200
    except Exception as e:
        logger.error(f"Get user error: {e}")
        return jsonify({'error': 'Failed to get user'}), 500

# ========== MARKETS ==========

@app.route('/api/markets', methods=['GET'])
def get_markets():
    """List all markets with filters"""
    try:
        status = request.args.get('status', 'open')
        community = request.args.get('community')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        markets = list_markets(status, community, limit, offset)

        # Convert timestamps and decimals to JSON-serializable types
        for market in markets:
            market['total_pool'] = float(market['total_pool'])
            # Handle datetime objects
            if market.get('created_at'):
                market['created_at'] = market['created_at'].isoformat() if hasattr(market['created_at'], 'isoformat') else market['created_at']
            if market.get('resolution_date'):
                market['resolution_date'] = market['resolution_date'].isoformat() if hasattr(market['resolution_date'], 'isoformat') else market['resolution_date']

        return jsonify({
            'markets': markets,
            'count': len(markets)
        }), 200

    except Exception as e:
        logger.error(f"List markets error: {e}")
        return jsonify({'error': 'Failed to list markets'}), 500

@app.route('/api/markets/<market_id>', methods=['GET'])
def get_market(market_id):
    """Get a specific market by ID"""
    try:
        market = get_market_by_id(market_id)

        if not market:
            return jsonify({'error': 'Market not found'}), 404

        # Convert to JSON-serializable
        market['total_pool'] = float(market['total_pool'])
        if market.get('created_at'):
            market['created_at'] = market['created_at'].isoformat() if hasattr(market['created_at'], 'isoformat') else market['created_at']
        if market.get('resolution_date'):
            market['resolution_date'] = market['resolution_date'].isoformat() if hasattr(market['resolution_date'], 'isoformat') else market['resolution_date']

        return jsonify({'market': market}), 200

    except Exception as e:
        logger.error(f"Get market error: {e}")
        return jsonify({'error': 'Failed to get market'}), 500

# ========== AI BETTING CONDITION GENERATION ==========

def generate_ai_betting_condition(content: dict, content_type: str = 'reddit') -> dict:
    """
    Use OpenAI to generate specific, verifiable betting conditions

    Args:
        content: Dict with title, summary/text, url
        content_type: 'reddit' or 'article'

    Returns:
        dict with question, description, resolution_criteria, confidence
    """
    if not openai_client:
        raise ValueError("OpenAI client not initialized")

    title = content.get('title', '')
    text = content.get('summary', content.get('text', ''))[:2000]  # Limit to 2000 chars
    url = content.get('url', '')

    # Determine approach: headline-only for simple topics, full content for complex
    is_complex = any(word in title.lower() for word in ['will', 'predict', 'forecast', 'expect', 'estimate'])

    if is_complex and len(text) > 100:
        # Use full content for complex topics
        prompt = f"""You are a prediction market designer. Create a specific, verifiable betting condition for this content.

**Title:** {title}

**Content:** {text}

**Requirements:**
1. Create a YES/NO question that can be objectively verified within 24-48 hours
2. Be specific with numbers, dates, or measurable outcomes
3. Focus on what's predictable (stock prices, announcements, votes, etc.)
4. Avoid subjective judgments

**Output format (JSON):**
{{
  "question": "Clear YES/NO question",
  "description": "2-3 sentence explanation of what will be measured",
  "resolution_criteria": "Exact method to verify outcome (specific source, metric, threshold)",
  "resolution_hours": 24 or 48,
  "confidence": "high" or "medium" or "low"
}}

Return ONLY valid JSON, no markdown or explanation."""

    else:
        # Use headline-only for simple topics
        prompt = f"""You are a prediction market designer. Create a quick betting condition based on this headline.

**Headline:** {title}

**Requirements:**
1. Create a simple YES/NO question about immediate outcomes
2. Should resolve within 24 hours
3. Focus on measurable events (announcements, releases, votes)

**Output format (JSON):**
{{
  "question": "Clear YES/NO question",
  "description": "1 sentence explanation",
  "resolution_criteria": "How to verify (source + metric)",
  "resolution_hours": 24,
  "confidence": "high" or "medium"
}}

Return ONLY valid JSON."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert at creating verifiable prediction markets. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=400
        )

        import json
        result_text = response.choices[0].message.content.strip()

        # Remove markdown code blocks if present
        if result_text.startswith('```'):
            result_text = re.sub(r'```json\n?|```\n?', '', result_text).strip()

        result = json.loads(result_text)

        # Validate required fields
        required = ['question', 'description', 'resolution_criteria', 'resolution_hours']
        if not all(key in result for key in required):
            raise ValueError(f"Missing required fields in AI response")

        return result

    except Exception as e:
        logger.error(f"AI generation error: {e}")
        raise ValueError(f"AI generation failed: {str(e)}")

# ========== REDDIT MARKET HELPERS ==========

def generate_reddit_market(reddit_post: dict, market_type: str = 'popularity') -> dict:
    """
    Generate a betting market for a Reddit post

    Args:
        reddit_post: Reddit post data from /api/search/reddit
        market_type: 'popularity', 'engagement', or 'prediction'

    Returns:
        dict with market question, description, resolution_criteria, etc.
    """
    title = reddit_post.get('title', 'Untitled')
    post_url = reddit_post.get('url', '')
    subreddit = reddit_post.get('subreddit', 'Unknown')
    current_score = reddit_post.get('score', 0)
    current_comments = reddit_post.get('num_comments', 0)
    reddit_id = reddit_post.get('id', '')

    # Determine resolution date (24 hours from now)
    resolution_date = (datetime.utcnow() + timedelta(hours=24)).isoformat()

    if market_type == 'popularity':
        # Bet on upvote milestones
        target_score = max(current_score * 2, current_score + 1000, 500)

        market = {
            'question': f'Will this r/{subreddit} post reach {target_score:,} upvotes in 24 hours?',
            'description': f'**Post:** {title}\n\nCurrent upvotes: **{current_score:,}**\n\nThis market resolves YES if the post reaches {target_score:,} upvotes within 24 hours.',
            'resolution_criteria': f'Market resolves YES if Reddit post reaches or exceeds {target_score} upvotes by {resolution_date}. Verified via Reddit API.',
            'resolution_date': resolution_date,
            'source_url': post_url,
            'source_title': title,
            'market_type': 'reddit_popularity',
            'source_metadata': {
                'reddit_id': reddit_id,
                'subreddit': subreddit,
                'initial_score': current_score,
                'target_score': target_score,
                'initial_comments': current_comments
            }
        }

    elif market_type == 'engagement':
        # Bet on comment milestones
        target_comments = max(current_comments * 2, current_comments + 100, 50)

        market = {
            'question': f'Will this r/{subreddit} post get {target_comments:,} comments in 24 hours?',
            'description': f'**Post:** {title}\n\nCurrent comments: **{current_comments:,}**\n\nThis market resolves YES if the post reaches {target_comments:,} comments within 24 hours.',
            'resolution_criteria': f'Market resolves YES if Reddit post reaches or exceeds {target_comments} comments by {resolution_date}. Verified via Reddit API.',
            'resolution_date': resolution_date,
            'source_url': post_url,
            'source_title': title,
            'market_type': 'reddit_engagement',
            'source_metadata': {
                'reddit_id': reddit_id,
                'subreddit': subreddit,
                'initial_score': current_score,
                'initial_comments': current_comments,
                'target_comments': target_comments
            }
        }

    elif market_type == 'prediction':
        # AI-generated prediction using OpenAI
        try:
            # Prepare content for AI
            ai_content = {
                'title': title,
                'summary': reddit_post.get('summary', title),  # Use title as fallback
                'url': post_url
            }

            # Generate AI betting condition
            ai_result = generate_ai_betting_condition(ai_content, content_type='reddit')

            # Calculate resolution date from AI's suggested hours
            ai_resolution_date = (datetime.utcnow() + timedelta(hours=ai_result['resolution_hours'])).isoformat()

            market = {
                'question': ai_result['question'],
                'description': f"**Post:** {title}\n\n**AI Analysis:** {ai_result['description']}\n\n**Subreddit:** r/{subreddit}",
                'resolution_criteria': ai_result['resolution_criteria'],
                'resolution_date': ai_resolution_date,
                'source_url': post_url,
                'source_title': title,
                'market_type': 'reddit_prediction',
                'source_metadata': {
                    'reddit_id': reddit_id,
                    'subreddit': subreddit,
                    'initial_score': current_score,
                    'initial_comments': current_comments,
                    'ai_confidence': ai_result.get('confidence', 'medium'),
                    'ai_generated': True
                }
            }

        except Exception as e:
            logger.error(f"AI generation failed for Reddit post, falling back to simple prediction: {e}")
            # Fallback to simple prediction if AI fails
            market = {
                'question': f'Will the discussion about "{title[:80]}..." gain significant traction?',
                'description': f'**Post:** {title}\n\n**Subreddit:** r/{subreddit}\n\nThis market resolves YES if the post reaches 2x upvotes or comments in 24 hours.',
                'resolution_criteria': f'Market resolves YES if post reaches {current_score * 2} upvotes OR {current_comments * 2} comments within 24 hours.',
                'resolution_date': resolution_date,
                'source_url': post_url,
                'source_title': title,
                'market_type': 'reddit_prediction',
                'source_metadata': {
                    'reddit_id': reddit_id,
                    'subreddit': subreddit,
                    'initial_score': current_score,
                    'initial_comments': current_comments,
                    'ai_generated': False,
                    'fallback': True
                }
            }

    else:
        raise ValueError(f'Unknown market_type: {market_type}')

    return market

@app.route('/api/markets', methods=['POST'])
@require_auth
def create_new_market():
    """Create a new prediction market"""
    try:
        user = get_current_user()
        data = request.json

        question = data.get('question')
        description = data.get('description', '')
        resolution_criteria = data.get('resolution_criteria')
        resolution_hours = data.get('resolution_hours', 24)
        community = data.get('community', 'general')
        source_url = data.get('source_url')
        source_title = data.get('source_title')
        image_url = data.get('image_url')
        market_type = data.get('market_type', 'article_prediction')
        source_metadata = data.get('source_metadata', {})

        # Validate required fields
        if not all([question, resolution_criteria]):
            return jsonify({'error': 'Question and resolution criteria required'}), 400

        # Calculate resolution date
        resolution_date = datetime.utcnow() + timedelta(hours=resolution_hours)

        # Create market
        market = create_market(
            question=question,
            description=description,
            resolution_criteria=resolution_criteria,
            resolution_date=resolution_date.isoformat(),
            created_by=user['id'],
            source_article_url=source_url,
            source_article_title=source_title,
            community=community,
            image_url=image_url,
            market_type=market_type,
            source_metadata=source_metadata
        )

        if not market:
            return jsonify({'error': 'Failed to create market'}), 500

        # Convert timestamps
        market['created_at'] = market['created_at'].isoformat() if market.get('created_at') else None
        market['resolution_date'] = market['resolution_date'].isoformat() if market.get('resolution_date') else None
        market['total_pool'] = float(market['total_pool'])

        return jsonify({
            'success': True,
            'market': market,
            'message': 'Market created successfully'
        }), 201

    except Exception as e:
        logger.error(f"Create market error: {e}")
        return jsonify({'error': 'Failed to create market'}), 500

@app.route('/api/markets/reddit', methods=['POST'])
@require_auth
def create_reddit_market():
    """Create a betting market for a Reddit post"""
    try:
        user = get_current_user()
        data = request.json

        reddit_post = data.get('reddit_post')
        market_type = data.get('market_type', 'popularity')

        # Validate required fields
        if not reddit_post:
            return jsonify({'error': 'Reddit post data required'}), 400

        if market_type not in ['popularity', 'engagement', 'prediction']:
            return jsonify({'error': 'Invalid market_type. Must be: popularity, engagement, or prediction'}), 400

        # Generate market from Reddit post
        market_data = generate_reddit_market(reddit_post, market_type)

        # Create market in database
        market = create_market(
            question=market_data['question'],
            description=market_data['description'],
            resolution_criteria=market_data['resolution_criteria'],
            resolution_date=market_data['resolution_date'],
            created_by=user['id'],
            source_article_url=market_data['source_url'],
            source_article_title=market_data['source_title'],
            community='reddit',
            image_url=reddit_post.get('image'),
            market_type=market_data['market_type'],
            source_metadata=market_data['source_metadata']
        )

        if not market:
            return jsonify({'error': 'Failed to create market'}), 500

        # Convert timestamps
        market['created_at'] = market['created_at'].isoformat() if market.get('created_at') else None
        market['resolution_date'] = market['resolution_date'].isoformat() if market.get('resolution_date') else None
        market['total_pool'] = float(market['total_pool'])

        return jsonify({
            'success': True,
            'market': market,
            'message': f'Reddit {market_type} market created successfully'
        }), 201

    except ValueError as e:
        logger.error(f"Reddit market validation error: {e}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Create Reddit market error: {e}")
        return jsonify({'error': 'Failed to create Reddit market'}), 500

# ========== BETTING ==========

@app.route('/api/bets/simulate', methods=['POST'])
@require_auth
def simulate_bet():
    """Simulate a bet to preview odds and payout (no state change)"""
    try:
        data = request.json
        market_id = data.get('market_id')
        outcome = data.get('outcome')  # 'YES' or 'NO'
        amount = float(data.get('amount'))

        if not all([market_id, outcome, amount]):
            return jsonify({'error': 'Missing required fields'}), 400

        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400

        # Get market
        market = get_market_by_id(market_id)
        if not market:
            return jsonify({'error': 'Market not found'}), 404

        if market['status'] != 'open':
            return jsonify({'error': 'Market is not open for betting'}), 400

        # Restore market maker state
        mm = restore_market(
            float(market['total_yes_shares']),
            float(market['total_no_shares'])
        )

        # Simulate bet
        result = mm.simulate_bet(outcome, amount)

        return jsonify({
            'success': True,
            'simulation': result
        }), 200

    except Exception as e:
        logger.error(f"Simulate bet error: {e}")
        return jsonify({'error': 'Simulation failed'}), 500

@app.route('/api/bets/place', methods=['POST'])
@require_auth
def place_bet():
    """Place a bet on a market"""
    try:
        user = get_current_user()
        data = request.json

        market_id = data.get('market_id')
        outcome = data.get('outcome')  # 'YES' or 'NO'
        amount = float(data.get('amount'))

        # Validate inputs
        if not all([market_id, outcome, amount]):
            return jsonify({'error': 'Missing required fields'}), 400

        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400

        if outcome not in ['YES', 'NO']:
            return jsonify({'error': 'Outcome must be YES or NO'}), 400

        # Check user balance
        if float(user['balance']) < amount:
            return jsonify({'error': 'Insufficient balance'}), 400

        # Get market
        market = get_market_by_id(market_id)
        if not market:
            return jsonify({'error': 'Market not found'}), 404

        if market['status'] != 'open':
            return jsonify({'error': 'Market is not open for betting'}), 400

        # Restore market maker and execute bet
        mm = restore_market(
            float(market['total_yes_shares']),
            float(market['total_no_shares'])
        )

        bet_result = mm.execute_bet(outcome, amount)

        # Create bet record
        bet = create_bet(
            user_id=user['id'],
            market_id=market_id,
            outcome=outcome,
            amount=amount,
            shares=bet_result['shares'],
            odds=bet_result['effective_price'],
            potential_payout=bet_result['potential_payout']
        )

        if not bet:
            return jsonify({'error': 'Failed to create bet'}), 500

        # Update market odds
        new_pool = float(market['total_pool']) + amount
        update_market_odds(
            market_id,
            bet_result['new_odds'],
            new_pool,
            bet_result['yes_shares'],
            bet_result['no_shares']
        )

        # Update user balance
        new_balance = float(user['balance']) - amount
        update_user_balance(user['id'], new_balance)
        increment_user_total_bets(user['id'])

        # Create transaction
        create_transaction(
            user_id=user['id'],
            tx_type='bet_placed',
            amount=-amount,
            balance_after=new_balance,
            market_id=market_id,
            bet_id=bet['id'],
            description=f"Bet ${amount} on {outcome}"
        )

        # Convert timestamps
        bet['created_at'] = bet['created_at'].isoformat() if bet.get('created_at') else None

        return jsonify({
            'success': True,
            'bet': bet,
            'new_balance': new_balance,
            'new_odds': bet_result['new_odds'],
            'message': f"Bet placed: ${amount} on {outcome}"
        }), 201

    except Exception as e:
        logger.error(f"Place bet error: {e}")
        return jsonify({'error': 'Failed to place bet'}), 500

@app.route('/api/bets/my-bets', methods=['GET'])
@require_auth
def get_my_bets():
    """Get current user's bets"""
    try:
        user = get_current_user()
        limit = int(request.args.get('limit', 50))

        bets = get_user_active_bets(user['id'], limit)

        # Convert to JSON-serializable
        for bet in bets:
            bet['amount'] = float(bet['amount'])
            bet['shares'] = float(bet['shares'])
            bet['potential_payout'] = float(bet['potential_payout'])
            if bet.get('created_at'):
                bet['created_at'] = bet['created_at'].isoformat() if hasattr(bet['created_at'], 'isoformat') else bet['created_at']
            if bet.get('resolution_date'):
                bet['resolution_date'] = bet['resolution_date'].isoformat() if hasattr(bet['resolution_date'], 'isoformat') else bet['resolution_date']

        return jsonify({
            'bets': bets,
            'count': len(bets)
        }), 200

    except Exception as e:
        logger.error(f"Get bets error: {e}")
        return jsonify({'error': 'Failed to get bets'}), 500

@app.route('/api/bets/market/<market_id>', methods=['GET'])
@require_auth
def get_market_bets(market_id):
    """Get current user's bets on a specific market"""
    try:
        user = get_current_user()
        bets = get_user_bets_on_market(user['id'], market_id)

        # Convert to JSON-serializable
        for bet in bets:
            bet['amount'] = float(bet['amount'])
            bet['shares'] = float(bet['shares'])
            bet['potential_payout'] = float(bet['potential_payout'])
            if bet.get('created_at'):
                bet['created_at'] = bet['created_at'].isoformat() if hasattr(bet['created_at'], 'isoformat') else bet['created_at']

        return jsonify({
            'bets': bets,
            'count': len(bets),
            'total_amount': sum(float(b['amount']) for b in bets)
        }), 200

    except Exception as e:
        logger.error(f"Get market bets error: {e}")
        return jsonify({'error': 'Failed to get bets'}), 500

# ========== MARKET RESOLUTION (ADMIN) ==========

@app.route('/api/admin/markets/<market_id>/resolve', methods=['POST'])
@require_auth
def resolve_market_admin(market_id):
    """Resolve a market and settle all bets (admin only for POC)"""
    try:
        # TODO: Add admin check
        user = get_current_user()

        data = request.json
        outcome = data.get('outcome')  # 'YES' or 'NO'

        if outcome not in ['YES', 'NO']:
            return jsonify({'error': 'Outcome must be YES or NO'}), 400

        # Resolve market
        success = resolve_market(market_id, outcome)
        if not success:
            return jsonify({'error': 'Failed to resolve market'}), 500

        # Settle all bets
        settled_count = settle_bets_for_market(market_id, outcome)

        # TODO: Distribute winnings and update user balances
        # This requires a separate function to process all winning bets

        return jsonify({
            'success': True,
            'message': f'Market resolved: {outcome} wins',
            'bets_settled': settled_count
        }), 200

    except Exception as e:
        logger.error(f"Resolve market error: {e}")
        return jsonify({'error': 'Failed to resolve market'}), 500

# ========== LEADERBOARD & SOCIAL ==========

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard_route():
    """Get top users"""
    try:
        limit = int(request.args.get('limit', 100))
        community = request.args.get('community')

        users = get_leaderboard(community, limit)

        # Convert to JSON-serializable
        for user in users:
            user['balance'] = float(user['balance'])
            user['total_winnings'] = float(user['total_winnings'])
            user['win_rate'] = float(user['win_rate'])

        return jsonify({
            'leaderboard': users,
            'count': len(users)
        }), 200

    except Exception as e:
        logger.error(f"Leaderboard error: {e}")
        return jsonify({'error': 'Failed to get leaderboard'}), 500

@app.route('/api/users/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    """Get public user profile"""
    try:
        user = get_user_by_id(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Return public profile (no sensitive data)
        return jsonify({
            'user': {
                'id': user['id'],
                'username': user['username'],
                'display_name': user['display_name'],
                'avatar_url': user['avatar_url'],
                'bio': user['bio'],
                'balance': float(user['balance']),
                'total_bets': user['total_bets'],
                'total_winnings': float(user['total_winnings']),
                'win_rate': float(user['win_rate']),
                'is_creator': user['is_creator'],
                'creator_bio': user['creator_bio']
            }
        }), 200

    except Exception as e:
        logger.error(f"Get user profile error: {e}")
        return jsonify({'error': 'Failed to get profile'}), 500

# ========== TRANSACTIONS ==========

@app.route('/api/transactions/my-history', methods=['GET'])
@require_auth
def get_my_transactions():
    """Get current user's transaction history"""
    try:
        user = get_current_user()
        limit = int(request.args.get('limit', 50))

        transactions = get_user_transactions(user['id'], limit)

        # Convert to JSON-serializable
        for tx in transactions:
            tx['amount'] = float(tx['amount'])
            tx['balance_after'] = float(tx['balance_after'])
            tx['created_at'] = tx['created_at'].isoformat() if tx.get('created_at') else None

        return jsonify({
            'transactions': transactions,
            'count': len(transactions)
        }), 200

    except Exception as e:
        logger.error(f"Get transactions error: {e}")
        return jsonify({'error': 'Failed to get transactions'}), 500


# ========== WEB SEARCH & MODAL ANALYSIS ==========

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

        logger.info(f"[WebSearch] Searching for: {query}")

        # Perform actual web search
        articles = search_google_news(query, max_results)

        results = {
            'query': query,
            'articles': articles,
            'total_results': len(articles)
        }

        return jsonify(results)

    except Exception as e:
        logger.error(f"[ERROR] Search failed: {str(e)}")
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

        logger.info(f"[WebSearch] Exploring topic: {query}")

        # Perform actual web search
        articles = search_google_news(query, max_results=20)

        results = {
            'query': query,
            'articles': articles,
            'total_results': len(articles)
        }

        return jsonify(results)

    except Exception as e:
        logger.error(f"[ERROR] Explore failed: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/search/reddit', methods=['POST'])
def search_reddit():
    """
    Search Reddit with modal filtering

    Request JSON:
    {
        "query": "climate change",
        "modal_filter": "REF",  # optional: NET, REF, POL, MOR, LAW
        "sort_by": "relevance",  # hot, new, top, relevance
        "limit": 20
    }
    """
    data = request.json
    query = data.get('query', '')
    modal_filter = data.get('modal_filter', None)
    sort_by = data.get('sort_by', 'relevance')
    limit = data.get('limit', 20)

    if not query:
        return jsonify({'error': 'Query required'}), 400

    try:
        # Initialize Reddit API
        reddit = praw.Reddit(
            client_id=os.getenv('REDDIT_CLIENT_ID'),
            client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
            user_agent=os.getenv('REDDIT_USER_AGENT', 'NewsMode v1.0')
        )

        # Search news-related subreddits
        subreddit_list = 'news+worldnews+politics+science+technology+business'
        subreddits = reddit.subreddit(subreddit_list)

        # Map sort_by to Reddit API parameters
        sort_map = {
            'hot': 'hot',
            'new': 'new',
            'top': 'top',
            'relevance': 'relevance'
        }
        reddit_sort = sort_map.get(sort_by, 'relevance')

        results = []
        analyzer = ModalAnalyzer()

        # Search Reddit
        search_results = subreddits.search(query, sort=reddit_sort, limit=limit*3)

        for post in search_results:
            try:
                # Get top comments
                post.comments.replace_more(limit=0)
                comments = [
                    {
                        'body': comment.body,
                        'created': comment.created_utc
                    }
                    for comment in post.comments[:20]
                ]

                # Analyze modal signature
                modal_data = analyzer.analyze_thread(
                    {
                        'title': post.title,
                        'body': post.selftext
                    },
                    comments
                )

                # Apply modal filter
                if modal_filter and modal_data['dominant_mode'] != modal_filter:
                    continue

                # Build article object matching NewsMode format
                article = {
                    'id': f'reddit_{post.id}',
                    'title': post.title,
                    'url': f"https://reddit.com{post.permalink}",
                    'source': f"r/{post.subreddit.display_name}",
                    'publishedAt': datetime.fromtimestamp(post.created_utc).isoformat(),
                    'summary': post.selftext[:200] if post.selftext else f"Discussion with {post.num_comments} comments",
                    'content': post.selftext or post.title,
                    'topic': 'Discussion',
                    'readTime': max(3, len(post.selftext.split()) // 200) if post.selftext else 3,
                    'image': None,

                    # Reddit-specific metadata
                    'reddit_score': post.score,
                    'reddit_comments': post.num_comments,

                    # Modal signature
                    'modal_signature': {
                        'dominant': modal_data['dominant_mode'],
                        'post_dominant': modal_data['post_dominant'],
                        'pathway': modal_data['pathway'],
                        'complexity': modal_data['complexity'],
                        'sequence': modal_data['sequence'],
                        'distribution': modal_data['mode_distribution']
                    }
                }

                results.append(article)

                # Stop when we have enough results
                if len(results) >= limit:
                    break

            except Exception as e:
                logger.warning(f"Error processing post {post.id}: {e}")
                continue

        return jsonify({
            'results': results,
            'count': len(results),
            'query': query,
            'modal_filter': modal_filter
        })

    except Exception as e:
        logger.error(f"Reddit search error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze/modal', methods=['POST'])
def analyze_modal():
    """
    Analyze modal signature of article text

    Request JSON:
    {
        "text": "article content...",
        "title": "article title"
    }
    """
    data = request.json
    text = data.get('text', '')
    title = data.get('title', '')

    if not text and not title:
        return jsonify({'error': 'Text or title required'}), 400

    analyzer = ModalAnalyzer()
    full_text = f"{title} {text}"

    scores = analyzer.analyze_text(full_text)
    dominant = analyzer.get_dominant_mode(full_text)
    normalized_scores = analyzer.calculate_modal_score(full_text)

    return jsonify({
        'dominant_mode': dominant,
        'raw_scores': scores,
        'normalized_scores': normalized_scores,
        'complexity': len([s for s in scores.values() if s > 0])
    })


# ========== ERROR HANDLERS ==========

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

# ========== FRONTEND SERVING ==========

@app.route('/')
def serve_frontend():
    """Serve the main index.html"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, images, etc.)"""
    # Don't serve /api/* routes as static files
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    return send_from_directory('.', path)

# ========== MAIN ==========

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5002))
    debug = os.getenv('DEBUG', 'True') == 'True'

    print(f"""
╔═══════════════════════════════════════════════════════════╗
║                    Bettit API Server                      ║
╠═══════════════════════════════════════════════════════════╣
║  Running on: http://localhost:{port}                        ║
║  Debug mode: {debug}                                          ║
║                                                           ║
║  Endpoints:                                               ║
║    POST /api/auth/register                                ║
║    POST /api/auth/login                                   ║
║    GET  /api/markets                                      ║
║    POST /api/markets                                      ║
║    POST /api/bets/place                                   ║
║    GET  /api/leaderboard                                  ║
╚═══════════════════════════════════════════════════════════╝
    """)

    app.run(host='0.0.0.0', port=port, debug=debug)
