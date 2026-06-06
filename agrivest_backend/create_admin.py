import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agrivest.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

username = 'admin'
email = 'benisonyason@gmail.com'
password = 'admin123'

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f"Superuser created: {username} / {password}")
else:
    print("Superuser already exists")
