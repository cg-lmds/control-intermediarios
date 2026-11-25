import urllib.request
from datetime import datetime

URL = "https://segmentador-referidores.onrender.com/health"

now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
try:
    with urllib.request.urlopen(URL, timeout=30) as resp:
        print(f"[{now}] OK - HTTP {resp.status} ({URL})")
except Exception as e:
    print(f"[{now}] ERROR - {e}")
