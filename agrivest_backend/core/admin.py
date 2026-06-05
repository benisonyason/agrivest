from django.contrib import admin
from django.apps import apps

# Auto-register all models
app = apps.get_app_config('core')
for model in app.get_models():
    try:
        admin.site.register(model)
    except admin.sites.AlreadyRegistered:
        pass