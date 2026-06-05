import os
import django
import pandas as pd
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agrivest.settings')
django.setup()

from django.apps import apps
from django.db import transaction

def import_all_data(excel_path='data.xlsx'):
    """Standalone function to import all data"""
    
    print(f"Loading Excel file: {excel_path}")
    excel_file = pd.ExcelFile(excel_path)
    
    # Get all models
    models_dict = {}
    for model in apps.get_app_config('core').get_models():
        models_dict[model._meta.db_table] = model
    
    # Import order
    import_order = [
        'farms', 'farmers', 'farm_blocks', 'farm_workers', 'crops',
        'plantings', 'yields', 'soil_zones', 'soil_tests'
    ]
    
    with transaction.atomic():
        for sheet_name in import_order:
            if sheet_name not in excel_file.sheet_names:
                continue
            
            if sheet_name not in models_dict:
                print(f"Warning: No model for {sheet_name}")
                continue
            
            print(f"Importing {sheet_name}...")
            df = pd.read_excel(excel_file, sheet_name)
            model = models_dict[sheet_name]
            
            for _, row in df.iterrows():
                data = {}
                for col in df.columns:
                    value = row[col]
                    if pd.isna(value):
                        continue
                    
                    field_name = col.lower().replace(' ', '_')
                    field_name = ''.join(c if c.isalnum() or c == '_' else '' for c in field_name)
                    
                    if col.endswith('_id') and col != df.columns[0]:
                        related_table = col[:-3]
                        if related_table in models_dict:
                            try:
                                related_obj = models_dict[related_table].objects.get(pk=int(value))
                                data[field_name] = related_obj
                            except:
                                data[field_name] = None
                        else:
                            data[field_name] = value
                    else:
                        if isinstance(value, str) and '-' in value and len(value) == 10:
                            try:
                                value = datetime.strptime(value, '%Y-%m-%d').date()
                            except:
                                pass
                        data[field_name] = value
                
                try:
                    pk_field = model._meta.pk.name
                    if pk_field in data:
                        model.objects.update_or_create(defaults=data, **{pk_field: data[pk_field]})
                    else:
                        model.objects.create(**data)
                except Exception as e:
                    print(f"Error in {sheet_name}: {e}")
    
    print("Import completed!")

if __name__ == "__main__":
    import_all_data()