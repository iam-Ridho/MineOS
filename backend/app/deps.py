import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import settings

security = HTTPBearer()
redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)

async def get_redis():
    return redis_client

async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        return jwt.decode(
            creds.credentials, settings.jwt_secret,
            algorithms=["HS256"],
            options={"verify_exp": False}
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token unvalid"
        )

async def get_current_user_demo():
    return {
        "sub": "demo-ridho",
        "role": "operator"
    }
