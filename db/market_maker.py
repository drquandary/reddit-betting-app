"""
Market Maker using Logarithmic Market Scoring Rule (LMSR)
"""
import math
from decimal import Decimal

class MarketMaker:
    """
    Automated Market Maker using LMSR (Logarithmic Market Scoring Rule)

    This provides instant liquidity and automatic price discovery
    """

    def __init__(self, liquidity=100):
        """
        Initialize market maker

        Args:
            liquidity: Liquidity parameter (higher = more stable prices)
        """
        self.liquidity = liquidity
        self.yes_shares = Decimal('0')
        self.no_shares = Decimal('0')

    def _cost_function(self, yes_shares, no_shares):
        """
        LMSR cost function: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))

        Args:
            yes_shares: Number of YES shares
            no_shares: Number of NO shares

        Returns:
            Cost in dollars
        """
        b = self.liquidity

        # Convert to float for math operations
        yes_exp = math.exp(float(yes_shares) / b)
        no_exp = math.exp(float(no_shares) / b)

        cost = b * math.log(yes_exp + no_exp)

        return Decimal(str(cost))

    def get_odds(self):
        """
        Get current odds for YES and NO

        Returns:
            dict with 'YES' and 'NO' odds (0 to 1)
        """
        b = self.liquidity

        yes_exp = math.exp(float(self.yes_shares) / b)
        no_exp = math.exp(float(self.no_shares) / b)

        total = yes_exp + no_exp

        yes_odds = yes_exp / total
        no_odds = no_exp / total

        return {
            'YES': yes_odds,
            'NO': no_odds
        }

    def simulate_bet(self, outcome, amount):
        """
        Simulate a bet without changing state

        Args:
            outcome: 'YES' or 'NO'
            amount: Bet amount in dollars

        Returns:
            dict with bet details
        """
        # Calculate current cost
        current_cost = self._cost_function(self.yes_shares, self.no_shares)

        # Calculate shares to buy
        # We need to find how many shares can be bought with the given amount
        # Using binary search to find the right number of shares

        left, right = 0.0, float(amount) * 10  # Upper bound is generous
        shares = 0.0

        for _ in range(100):  # Binary search iterations
            mid = (left + right) / 2

            if outcome == 'YES':
                new_yes = float(self.yes_shares) + mid
                new_no = float(self.no_shares)
            else:
                new_yes = float(self.yes_shares)
                new_no = float(self.no_shares) + mid

            new_cost = self._cost_function(Decimal(str(new_yes)), Decimal(str(new_no)))
            cost_diff = float(new_cost - current_cost)

            if abs(cost_diff - float(amount)) < 0.01:
                shares = mid
                break
            elif cost_diff < float(amount):
                left = mid
            else:
                right = mid

        shares = Decimal(str(shares))

        # Calculate new state
        if outcome == 'YES':
            new_yes_shares = self.yes_shares + shares
            new_no_shares = self.no_shares
        else:
            new_yes_shares = self.yes_shares
            new_no_shares = self.no_shares + shares

        # Calculate new odds
        yes_exp = math.exp(float(new_yes_shares) / self.liquidity)
        no_exp = math.exp(float(new_no_shares) / self.liquidity)
        total = yes_exp + no_exp

        new_odds = {
            'YES': yes_exp / total,
            'NO': no_exp / total
        }

        # Calculate effective price and potential payout
        effective_price = float(amount) / float(shares) if shares > 0 else 0
        potential_payout = float(shares)  # Each share pays $1 if wins

        return {
            'shares': float(shares),
            'effective_price': effective_price,
            'potential_payout': potential_payout,
            'new_odds': new_odds,
            'yes_shares': float(new_yes_shares),
            'no_shares': float(new_no_shares)
        }

    def execute_bet(self, outcome, amount):
        """
        Execute a bet and update state

        Args:
            outcome: 'YES' or 'NO'
            amount: Bet amount in dollars

        Returns:
            dict with bet details
        """
        result = self.simulate_bet(outcome, amount)

        # Update state
        self.yes_shares = Decimal(str(result['yes_shares']))
        self.no_shares = Decimal(str(result['no_shares']))

        return result


def restore_market(yes_shares, no_shares, liquidity=100):
    """
    Restore a market maker from saved state

    Args:
        yes_shares: Current YES shares
        no_shares: Current NO shares
        liquidity: Liquidity parameter

    Returns:
        MarketMaker instance
    """
    mm = MarketMaker(liquidity=liquidity)
    mm.yes_shares = Decimal(str(yes_shares))
    mm.no_shares = Decimal(str(no_shares))
    return mm
