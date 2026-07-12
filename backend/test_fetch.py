import urllib.request
import json
import os

try:
    req = urllib.request.Request("http://localhost:8000/api/products")
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        with open("scratch.json", "w") as f:
            json.dump(data, f, indent=2)
except Exception as e:
    with open("scratch.json", "w") as f:
        f.write(str(e))
