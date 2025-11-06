"""
Authentication module for Bettit API
"""
import uuid
import hashlib
import secrets
from functools import wraps
from flask import request, jsonify, g
from datetime import datetime, timedelta
from decimal import Decimal
from . import db

# In-memory token storage
_tokens = {}  # token -> user_id

def hash_password(password):
    """Hash a password"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token():
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)

def register_user(username, email, password, display_name=None):
    """
    Register a new user

    Returns:
        (success, user_data, error_message)
    """
    # Check if user exists
    for user in db._users.values():
        if user['email'] == email:
            return False, None, 'Email already registered'
        if user['username'] == username:
            return False, None, 'Username already taken'

    # Create user
    user_id = str(uuid.uuid4())
    token = generate_token()

    user_data = {
        'id': user_id,
        'username': username,
        'email': email,
        'password_hash': hash_password(password),
        'display_name': display_name or username,
        'avatar_url': None,
        'bio': '',
        'balance': Decimal('1000'),  # Starting balance
        'total_bets': 0,
        'total_winnings': Decimal('0'),
        'win_rate': Decimal('0'),
        'is_creator': False,
        'creator_bio': None,
        'created_at': datetime.utcnow(),
        'token': token
    }

    db.add_user(user_data)
    _tokens[token] = user_id

    # Return user data without password hash
    return_data = {k: v for k, v in user_data.items() if k != 'password_hash'}

    return True, return_data, None

def login_user(email, password):
    """
    Login user with email and password

    Returns:
        (success, user_data, error_message)
    """
    # Find user by email
    user = None
    for u in db._users.values():
        if u['email'] == email:
            user = u
            break

    if not user:
        return False, None, 'Invalid email or password'

    # Check password
    if user['password_hash'] != hash_password(password):
        return False, None, 'Invalid email or password'

    # Generate new token
    token = generate_token()
    user['token'] = token
    _tokens[token] = user['id']

    # Return user data without password hash
    return_data = {k: v for k, v in user.items() if k != 'password_hash'}

    return True, return_data, None

def validate_token(token):
    """
    Validate a JWT token

    Returns:
        (valid, user_data, error_message)
    """
    user_id = _tokens.get(token)
    if not user_id:
        return False, None, 'Invalid token'

    user = db._users.get(user_id)
    if not user:
        return False, None, 'User not found'

    # Return user data without password hash
    return_data = {k: v for k, v in user.items() if k != 'password_hash'}

    return True, return_data, None

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Missing authorization header'}), 401

        # Extract token (Bearer <token>)
        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != 'Bearer':
            return jsonify({'error': 'Invalid authorization header'}), 401

        token = parts[1]

        # Validate token
        valid, user_data, error = validate_token(token)
        if not valid:
            return jsonify({'error': error}), 401

        # Store user in Flask g object
        g.current_user = user_data

        return f(*args, **kwargs)

    return decorated_function

def get_current_user():
    """Get the current authenticated user from Flask g"""
    return g.current_user
