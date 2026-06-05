#!/usr/bin/env python3
"""
One‑click Agrivest backend setup from Excel.
Run: python auto_setup.py
"""

import os
import sys
import subprocess
import tempfile
from pathlib import Path

# ========== CONFIGURATION ==========
PROJECT_NAME = "agrivest"
APP_NAME = "core"
EXCEL_FILE = "data.xlsx"
ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@example.com"
AUTO_ADMIN_PASSWORD = "admin123"  # set to None to prompt
# ===================================


def run_command(cmd, check=True):
    """Run a shell command, print output, raise on error."""
    print(f"\n> {cmd}")
    result = subprocess.run(cmd, shell=True, text=True, capture_output=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if check and result.returncode != 0:
        raise RuntimeError(f"Command failed with exit code {result.returncode}\n{cmd}")
    return result


def create_virtualenv():
    """Create venv and return paths to python and pip."""
    venv_dir = Path("venv")
    if not venv_dir.exists():
        print("Creating virtual environment...")
        base_python = sys.executable
        run_command(f'"{base_python}" -m venv venv')
    if os.name == "nt":
        python_path = venv_dir / "Scripts" / "python.exe"
        pip_path = venv_dir / "Scripts" / "pip.exe"
    else:
        python_path = venv_dir / "bin" / "python"
        pip_path = venv_dir / "bin" / "pip"
    return str(python_path), str(pip_path)


def install_requirements(pip_path):
    """Install required packages."""
    packages = [
        "django",
        "djangorestframework",
        "pandas",
        "openpyxl",
        "djangorestframework-simplejwt",
    ]
    run_command(f'"{pip_path}" install ' + " ".join(packages))


def create_django_project(python_path):
    """Create Django project and app if not already present."""
    if not Path("manage.py").exists():
        run_command(f'"{python_path}" -m django startproject {PROJECT_NAME} .')
    if not Path(APP_NAME).exists():
        run_command(f'"{python_path}" manage.py startapp {APP_NAME}')


def write_settings():
    """Configure settings.py with app, REST framework, and database."""
    settings_path = Path(PROJECT_NAME) / "settings.py"
    if not settings_path.exists():
        raise FileNotFoundError("settings.py not found – project creation failed?")

    with open(settings_path, "r") as f:
        content = f.read()

    # Add core and rest_framework to INSTALLED_APPS if missing
    if APP_NAME not in content:
        lines = content.splitlines()
        new_lines = []
        in_installed = False
        for line in lines:
            new_lines.append(line)
            if "INSTALLED_APPS = [" in line:
                in_installed = True
            if in_installed and line.strip().startswith("]"):
                new_lines.insert(-1, f"    '{APP_NAME}',")
                new_lines.insert(-1, "    'rest_framework',")
                in_installed = False
        content = "\n".join(new_lines)

    # Add REST_FRAMEWORK settings
    if "REST_FRAMEWORK" not in content:
        content += """

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
}
"""
    with open(settings_path, "w") as f:
        f.write(content)
    print("settings.py configured.")


def write_model_generator():
    """Write core/model_generator.py – first column = PK, other _id = FK."""
    code = """import pandas as pd
import re

def to_model_name(sheet_name: str) -> str:
    return ''.join(word.capitalize() for word in sheet_name.split('_'))

def to_field_name(col_name: str) -> str:
    return re.sub(r'[^a-zA-Z0-9_]', '', col_name).lower()

def infer_field_type(series: pd.Series, col_name: str) -> str:
    non_null = series.dropna()
    if len(non_null) == 0:
        return "models.TextField(blank=True, null=True)"
    try:
        pd.to_datetime(non_null.iloc[0])
        if all(pd.to_datetime(non_null, errors='coerce').notna()):
            return "models.DateField(blank=True, null=True)"
    except:
        pass
    if pd.api.types.is_integer_dtype(non_null):
        return "models.IntegerField(blank=True, null=True)"
    if pd.api.types.is_float_dtype(non_null):
        currency_keywords = ('cost', 'price', 'amount', 'revenue', 'profit', 'rate',
                             'value', 'loss', 'freight', 'insurance', 'customs')
        if any(kw in col_name.lower() for kw in currency_keywords):
            return "models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)"
        return "models.FloatField(blank=True, null=True)"
    max_len = non_null.astype(str).str.len().max()
    if max_len < 255:
        return f"models.CharField(max_length={max_len}, blank=True, null=True)"
    return "models.TextField(blank=True, null=True)"

def generate_models_from_excel(excel_path: str) -> str:
    xl = pd.ExcelFile(excel_path)
    sheet_names = xl.sheet_names
    models_code = "from django.db import models\\n\\n"

    for sheet in sheet_names:
        df = pd.read_excel(xl, sheet)
        model_name = to_model_name(sheet)
        models_code += f"class {model_name}(models.Model):\\n"
        columns = list(df.columns)

        for idx, col in enumerate(columns):
            field_name = to_field_name(col)
            # First column is primary key
            if idx == 0:
                models_code += f"    {field_name} = models.AutoField(primary_key=True)\\n"
                continue
            # Any other column ending with '_id' is a foreign key
            if col.endswith('_id'):
                target_sheet = col[:-3]
                if target_sheet in sheet_names:
                    related_model = to_model_name(target_sheet)
                else:
                    related_model = to_model_name(target_sheet)
                if related_model == model_name:
                    models_code += f"    {field_name} = models.IntegerField(blank=True, null=True)\\n"
                else:
                    models_code += f"    {field_name} = models.ForeignKey('{related_model}', on_delete=models.CASCADE, blank=True, null=True)\\n"
            else:
                field_type = infer_field_type(df[col], col)
                models_code += f"    {field_name} = {field_type}\\n"

        models_code += f"\\n    class Meta:\\n        db_table = '{sheet}'\\n        verbose_name = '{model_name}'\\n        verbose_name_plural = '{model_name}s'\\n\\n"
        # FIXED: use self.pk instead of getattr with double quotes
        models_code += "    def __str__(self):\\n        return f'{self.__class__.__name__} {self.pk}'\\n\\n"

    return models_code
"""
    Path(APP_NAME).mkdir(exist_ok=True)
    with open(Path(APP_NAME) / "model_generator.py", "w") as f:
        f.write(code)
    print("model_generator.py written.")
    

def write_smart_importer():
    """Write core/smart_importer.py – topological import with FK resolution."""
    code = """import pandas as pd
from django.apps import apps
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from collections import defaultdict, deque

def topological_sort(models_list, dependencies):
    in_degree = defaultdict(int)
    adj = defaultdict(list)
    for dep, mods in dependencies.items():
        for mod in mods:
            adj[dep].append(mod)
            in_degree[mod] += 1
    for mod in models_list:
        if mod not in in_degree:
            in_degree[mod] = 0
    queue = deque([mod for mod in models_list if in_degree[mod] == 0])
    order = []
    while queue:
        mod = queue.popleft()
        order.append(mod)
        for neighbor in adj[mod]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    if len(order) != len(models_list):
        raise ValueError("Circular dependency detected")
    return order

@transaction.atomic
def import_sheet(sheet_name, model):
    df = pd.read_excel('data.xlsx', sheet_name=sheet_name)
    field_map = {}
    for col in df.columns:
        field_name = col.lower().replace(' ', '_')
        field_name = ''.join(c if c.isalnum() or c == '_' else '' for c in field_name)
        field_map[col] = field_name

    for _, row in df.iterrows():
        data = {}
        for excel_col, field_name in field_map.items():
            value = row[excel_col]
            if pd.isna(value):
                continue
            if excel_col.endswith('_id') and excel_col != df.columns[0]:
                target_sheet = excel_col[:-3]
                related_model = None
                for m in apps.get_models():
                    if m._meta.db_table == target_sheet:
                        related_model = m
                        break
                if related_model:
                    try:
                        pk_field = related_model._meta.pk.name
                        obj = related_model.objects.get(**{pk_field: value})
                        data[field_name] = obj
                    except ObjectDoesNotExist:
                        pass
                else:
                    data[field_name] = value
            else:
                if isinstance(value, str) and '-' in value and len(value) == 10:
                    try:
                        value = pd.to_datetime(value).date()
                    except:
                        pass
                data[field_name] = value
        pk_field = model._meta.pk.name
        if pk_field in data:
            model.objects.update_or_create(defaults=data, **{pk_field: data[pk_field]})
        else:
            model.objects.create(**data)

def import_all(excel_path='data.xlsx'):
    from django.apps import apps
    apps.get_models()
    models = []
    for model in apps.get_models():
        if hasattr(model._meta, 'db_table') and model._meta.db_table in pd.ExcelFile(excel_path).sheet_names:
            models.append(model)

    graph = defaultdict(list)
    for model in models:
        for field in model._meta.get_fields():
            if field.is_relation and field.remote_field:
                rel_model = field.remote_field.model
                if rel_model in models:
                    graph[rel_model._meta.label].append(model._meta.label)

    model_labels = [m._meta.label for m in models]
    sorted_labels = topological_sort(model_labels, graph)
    sorted_models = [apps.get_model(label) for label in sorted_labels]

    for model in sorted_models:
        sheet_name = model._meta.db_table
        print(f"Importing {sheet_name}...")
        import_sheet(sheet_name, model)
    print("All data imported successfully!")
"""
    with open(Path(APP_NAME) / "smart_importer.py", "w") as f:
        f.write(code)
    print("smart_importer.py written.")


def write_management_command():
    """Write core/management/commands/import_excel.py."""
    os.makedirs(Path(APP_NAME) / "management" / "commands", exist_ok=True)
    code = """from django.core.management.base import BaseCommand
from core.model_generator import generate_models_from_excel
from core.smart_importer import import_all
import os

class Command(BaseCommand):
    help = 'Generate models from Excel and import data'
    def handle(self, *args, **options):
        excel_path = 'data.xlsx'
        if not os.path.exists(excel_path):
            self.stderr.write(self.style.ERROR(f'Excel file not found: {excel_path}'))
            return
        self.stdout.write('Generating models from Excel...')
        models_code = generate_models_from_excel(excel_path)
        with open('core/models.py', 'w') as f:
            f.write(models_code)
        self.stdout.write(self.style.SUCCESS('models.py generated.'))
        self.stdout.write('Making migrations...')
        os.system('python manage.py makemigrations')
        os.system('python manage.py migrate')
        self.stdout.write('Importing data...')
        import_all(excel_path)
        self.stdout.write(self.style.SUCCESS('Done!'))
"""
    with open(Path(APP_NAME) / "management" / "commands" / "import_excel.py", "w") as f:
        f.write(code)
    (Path(APP_NAME) / "management" / "__init__.py").touch()
    (Path(APP_NAME) / "management" / "commands" / "__init__.py").touch()
    print("Management command written.")


def write_admin():
    """Auto‑register all models in admin."""
    code = """from django.contrib import admin
from django.apps import apps
app = apps.get_app_config('core')
for model in app.get_models():
    try:
        admin.site.register(model)
    except admin.sites.AlreadyRegistered:
        pass
"""
    with open(Path(APP_NAME) / "admin.py", "w") as f:
        f.write(code)
    print("admin.py written.")


def write_serializers_views_urls():
    """Generate REST API files."""
    ser_code = """from rest_framework import serializers
from django.apps import apps
def get_serializers():
    serializers_dict = {}
    for model in apps.get_app_config('core').get_models():
        class_name = f'{model.__name__}Serializer'
        meta = type('Meta', (), {'model': model, 'fields': '__all__'})
        serializer = type(class_name, (serializers.ModelSerializer,), {'Meta': meta})
        serializers_dict[model.__name__] = serializer
    return serializers_dict
"""
    with open(Path(APP_NAME) / "serializers.py", "w") as f:
        f.write(ser_code)

    views_code = """from rest_framework import viewsets
from django.apps import apps
from .serializers import get_serializers
serializers_map = get_serializers()
def create_viewset(model):
    serializer_class = serializers_map[model.__name__]
    class_name = f'{model.__name__}ViewSet'
    return type(class_name, (viewsets.ModelViewSet,), {
        'queryset': model.objects.all(),
        'serializer_class': serializer_class,
    })
view_sets = {}
for model in apps.get_app_config('core').get_models():
    view_sets[model.__name__.lower()] = create_viewset(model)
"""
    with open(Path(APP_NAME) / "views.py", "w") as f:
        f.write(views_code)

    urls_code = """from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import view_sets
router = DefaultRouter()
for name, viewset in view_sets.items():
    router.register(name, viewset)
urlpatterns = [
    path('', include(router.urls)),
]
"""
    with open(Path(APP_NAME) / "urls.py", "w") as f:
        f.write(urls_code)

    # Include app URLs in project urls.py
    project_urls = Path(PROJECT_NAME) / "urls.py"
    with open(project_urls, "r") as f:
        content = f.read()
    if "path('api/', include('core.urls'))" not in content:
        lines = content.splitlines()
        new_lines = []
        inserted = False
        for line in lines:
            new_lines.append(line)
            if "path('admin/', admin.site.urls)" in line and not inserted:
                new_lines.append("    path('api/', include('core.urls')),")
                inserted = True
        content = "\n".join(new_lines)
        with open(project_urls, "w") as f:
            f.write(content)
    print("REST API files written.")


def run_migrations_and_import(python_path):
    """Run the import_excel management command."""
    run_command(f'"{python_path}" manage.py makemigrations {APP_NAME}')
    run_command(f'"{python_path}" manage.py migrate')
    run_command(f'"{python_path}" manage.py import_excel')


def create_superuser(python_path):
    """Create superuser using Django shell."""
    script = f"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', '{PROJECT_NAME}.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='{ADMIN_USERNAME}').exists():
    User.objects.create_superuser('{ADMIN_USERNAME}', '{ADMIN_EMAIL}', '{AUTO_ADMIN_PASSWORD if AUTO_ADMIN_PASSWORD else input("Password: ")}')
    print("Superuser created.")
else:
    print("Superuser already exists.")
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(script)
        temp_script = f.name
    run_command(f'"{python_path}" manage.py shell < "{temp_script}"')
    os.unlink(temp_script)


def start_server(python_path):
    """Run development server."""
    print("\n" + "=" * 60)
    print("Setup complete! Starting Django development server...")
    print("Admin panel: http://127.0.0.1:8000/admin/")
    print("API root: http://127.0.0.1:8000/api/")
    print("Press Ctrl+C to stop the server.\n")
    run_command(f'"{python_path}" manage.py runserver', check=False)


def main():
    print("🚀 Automated Agrivest Backend Setup (Excel → Django)\n")
    if not Path(EXCEL_FILE).exists():
        print(f"ERROR: {EXCEL_FILE} not found in current directory.")
        sys.exit(1)

    # Clean previous broken state (optional but recommended)
    if Path("core/models.py").exists():
        print("Removing old models.py to avoid syntax errors...")
        os.remove("core/models.py")

    python_path, pip_path = create_virtualenv()
    install_requirements(pip_path)
    create_django_project(python_path)
    write_settings()
    write_model_generator()
    write_smart_importer()
    write_management_command()
    write_admin()
    write_serializers_views_urls()
    run_migrations_and_import(python_path)
    create_superuser(python_path)
    start_server(python_path)


if __name__ == "__main__":
    main()
