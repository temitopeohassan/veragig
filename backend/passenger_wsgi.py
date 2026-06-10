import os
import sys

# Add the application directory to the python path
# This allows 'app' to be imported correctly by Passenger
sys.path.insert(0, os.path.dirname(__file__))

from a2wsgi import ASGIMiddleware
from app.main import app

# Passenger looks for the 'application' variable
application = ASGIMiddleware(app)
