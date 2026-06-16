import urllib.request
import json

try:
    req = urllib.request.Request("http://localhost:8000/users/me")
    # Need auth token, but we don't have it.
    # Without token, it should return 401 Unauthorized, NOT 500.
    res = urllib.request.urlopen(req)
    print(res.read())
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(e)
