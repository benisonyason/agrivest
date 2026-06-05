from rest_framework import serializers
from django.apps import apps

def get_serializers():
    """Create serializers dynamically with nested relations"""
    serializers_dict = {}
    app_config = apps.get_app_config('core')
    
    for model in app_config.get_models():
        model_name = model.__name__
        class_name = f'{model_name}Serializer'
        
        # Create Meta class with depth for nested relations
        meta_attrs = {
            'model': model,
            'fields': '__all__',
            'depth': 1
        }
        Meta = type('Meta', (), meta_attrs)
        
        # Create the serializer class
        serializer = type(class_name, (serializers.ModelSerializer,), {'Meta': Meta})
        serializers_dict[model_name] = serializer
    
    return serializers_dict

# Pre-create the serializers map
serializers_map = get_serializers()