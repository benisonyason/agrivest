from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.apps import apps
from .serializers import serializers_map

def create_viewset(model):
    """Create a viewset for a model with filtering enabled"""
    serializer_class = serializers_map[model.__name__]
    class_name = f'{model.__name__}ViewSet'
    
    return type(class_name, (viewsets.ModelViewSet,), {
        'queryset': model.objects.all(),
        'serializer_class': serializer_class,
        'filter_backends': [DjangoFilterBackend],
        'filterset_fields': '__all__',
    })

# Create viewsets for all models
view_sets = {}
for model in apps.get_app_config('core').get_models():
    view_sets[model.__name__.lower()] = create_viewset(model)

@api_view(['GET'])
def test_data(request):
    from .models import Farms, Crops, Yields
    return Response({
        'farms_count': Farms.objects.count(),
        'crops_count': Crops.objects.count(),
        'yields_count': Yields.objects.count(),
        'message': 'Backend is working!'
    })