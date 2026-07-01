import hashlib
import json
import logging
from typing import Any, Callable

logger = logging.getLogger("lifemap.cache")

try:
    import redis
except ImportError:
    redis = None

from app.config import get_settings

# Local memory fallback
_local_cache = {}

def _get_redis_client():
    settings = get_settings()
    if not redis or not settings.REDIS_URL:
        return None
    try:
        if settings.REDIS_URL.startswith("rediss://"):
            client = redis.from_url(settings.REDIS_URL, ssl_cert_reqs="none")
        else:
            client = redis.from_url(settings.REDIS_URL)
        client.ping()
        return client
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Falling back to in-memory cache.")
        return None

def clear_cache(key_prefix: str):
    """
    Clears all cache keys that start with the given prefix.
    """
    client = _get_redis_client()
    if client:
        try:
            # Redis clear using scan to avoid blocking
            cursor = 0
            while True:
                cursor, keys = client.scan(cursor=cursor, match=f"lifemap:{key_prefix}*")
                if keys:
                    client.delete(*keys)
                if cursor == 0:
                    break
        except Exception as e:
            logger.warning(f"Redis cache clearing failed: {e}")
    
    # Also clear local cache if used
    keys_to_delete = [k for k in _local_cache.keys() if k.startswith(f"lifemap:{key_prefix}")]
    for k in keys_to_delete:
        del _local_cache[k]


def cached(ttl_seconds: int = 300, key_prefix: str = ""):
    """
    Decorator that caches function results. 
    Uses Redis if REDIS_URL is provided and reachable, otherwise falls back to local dict.
    `key_prefix` is useful for invalidating groups of related keys (e.g. 'products' or 'user:123').
    """
    def decorator(func: Callable) -> Callable:
        import functools
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            import inspect
            try:
                bound_args = inspect.signature(func).bind(*args, **kwargs)
                bound_args.apply_defaults()
                cache_dict = {k: v for k, v in bound_args.arguments.items() if k not in ('self', 'cls', 'request', 'user')}
                if 'user' in bound_args.arguments and isinstance(bound_args.arguments['user'], dict):
                    cache_dict['user_id'] = bound_args.arguments['user'].get('user_id')
                key_data = f"{func.__name__}:{repr(cache_dict)}"
            except Exception:
                # Fallback if inspect fails
                args_repr = [repr(a) for a in args]
                kwargs_repr = [f"{k}={repr(v)}" for k, v in sorted(kwargs.items())]
                key_data = f"{func.__name__}:{','.join(args_repr)}:{','.join(kwargs_repr)}"
            
            # The final cache key includes the prefix for easy invalidation
            hash_str = hashlib.md5(key_data.encode()).hexdigest()
            cache_key = f"lifemap:{key_prefix}:{hash_str}" if key_prefix else f"lifemap:{hash_str}"
            
            client = _get_redis_client()
            
            if client:
                try:
                    cached_result = client.get(cache_key)
                    if cached_result:
                        import pickle
                        logger.info(f"🟢 Cache HIT [Redis] for key: {cache_key}")
                        return pickle.loads(cached_result)
                except Exception as e:
                    logger.warning(f"Redis get failed: {e}")
            else:
                import time
                if cache_key in _local_cache:
                    cached_time, cached_val = _local_cache[cache_key]
                    if time.time() - cached_time < ttl_seconds:
                        logger.info(f"🟢 Cache HIT [Local] for key: {cache_key}")
                        return cached_val
            
            logger.info(f"🔴 Cache MISS for key: {cache_key}")
            result = func(*args, **kwargs)
            
            if client:
                try:
                    import pickle
                    client.setex(cache_key, ttl_seconds, pickle.dumps(result))
                except Exception as e:
                    logger.warning(f"Redis setex failed: {e}")
            else:
                import time
                _local_cache[cache_key] = (time.time(), result)
                
            return result
        return wrapper
    return decorator
