#!/bin/bash
# Build script for Render

# Exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate --noinput
