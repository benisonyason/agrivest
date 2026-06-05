from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import view_sets
from .views import test_data

router = DefaultRouter()
for name, viewset in view_sets.items():
    router.register(name, viewset)

urlpatterns = [
    path('', include(router.urls)),
    path('test/', test_data, name='test_data'),
]