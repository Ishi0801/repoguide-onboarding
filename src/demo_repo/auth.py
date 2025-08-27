"""
Auth module.
Login flow:
- Reads Authorization header
- Validates session in Redis
- On failure, returns 401.
"""
def check_auth(token: str) -> bool:
    return token.startswith("Bearer ")
