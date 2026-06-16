import os
import sys

# 1. Add the current directory to the path so it can find the 'app' folder
sys.path.insert(0, os.path.dirname(__file__))

# 2. Import the ASGI to WSGI adapter
from a2wsgi import ASGIMiddleware

# 3. Import your FastAPI app
try:
    from app.main import app
except ImportError as e:
    # This will print the error to stderr.log if it still can't find 'app'
    print(f"ImportError: {e}")
    raise

# 4. Passenger looks for the 'application' variable
application = ASGIMiddleware(app)
