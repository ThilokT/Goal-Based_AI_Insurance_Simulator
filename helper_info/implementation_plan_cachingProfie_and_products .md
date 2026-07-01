# In-Memory Caching (Redis) Implementation

This plan details the steps to implement the "Cache-Aside" pattern using Redis (with a local dictionary fallback) as specified in the scaling guide.

## Proposed Changes

### Configuration and Dependencies

#### [MODIFY] [requirements.txt](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/requirements.txt)
- Add `redis>=5.0.0` to the list of backend dependencies.

#### [MODIFY] [config.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/config.py)
- Add `REDIS_URL: str = ""` to the `Settings` class to support remote or local Redis connections.

### Core Caching Service

#### [NEW] [cache_decorator.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/services/cache_decorator.py)
- Create a new service file containing the `@cached(ttl_seconds)` decorator.
- Implement a graceful fallback to a local in-memory dictionary if the `REDIS_URL` is empty or if the Redis connection fails, ensuring the application remains robust.

### Implementing Cache on Services

#### [MODIFY] [product_service.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/services/product_service.py)
- Apply `@cached(ttl_seconds=3600)` (1 hour) to the `list_products` method. This absorbs heavy DB reads for the product catalog.
- Apply `@cached(ttl_seconds=3600)` to the `get_product` method.

#### [MODIFY] [users.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/users.py)
- Apply `@cached(ttl_seconds=300)` (5 minutes) to the `get_my_profile` route. This caches user profiles and reduces DB strain from frequent chat operations.

#### [MODIFY] [vectorstore.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/ai_services/vectorstore.py)
- Apply `@cached(ttl_seconds=1800)` (30 minutes) to the `search_products` method in `ProductVectorStore` to avoid regenerating embeddings for identical semantic queries.

### Cache Invalidation on Writes

To avoid showing stale data without querying the database on every read (which defeats the purpose of the cache), we will use **Active Cache Invalidation**. When data is updated, we will delete the corresponding cache keys so the next read fetches fresh data.

#### [MODIFY] [product_service.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/services/product_service.py)
- In `create_product`, `bulk_upsert`, and `delete_product`, call a cache invalidation function to clear the `list_products` and specific `get_product` cache keys.

#### [MODIFY] [users.py](file:///c:/Users/hp/Downloads/Goal-Based_AI_Insurance_Simulator-main/Goal-Based_AI_Insurance_Simulator-main/backend/app/routers/users.py)
- In `update_my_profile`, call a cache invalidation function to clear the `get_my_profile` cache key for that specific user.

## Verification Plan

### Automated Tests
- No new automated tests are planned; we will ensure existing tests pass.

### Manual Verification
- We will perform identical requests (e.g., getting a product list or user profile) and measure response times.
- We will monitor console logs for Redis connection warnings and verify that the fallback in-memory caching mechanism operates correctly.
