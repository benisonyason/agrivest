import pandas as pd
from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import transaction
from datetime import datetime

class Command(BaseCommand):
    help = 'Import data from Excel file into Django models'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default='data.xlsx', help='Excel file path')

    @transaction.atomic
    def handle(self, *args, **options):
        excel_path = options['file']
        
        self.stdout.write(f"Importing data from {excel_path}...")
        
        # Load Excel file
        try:
            excel_file = pd.ExcelFile(excel_path)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error loading Excel file: {e}"))
            return
        
        # Get all models
        models_dict = {}
        for model in apps.get_app_config('core').get_models():
            models_dict[model._meta.db_table] = model
        
        # Define import order (parents first)
        import_order = [
            'farms', 'farmers', 'farm_blocks', 'farm_workers', 'crops',
            'plantings', 'yields', 'soil_zones', 'soil_tests', 'crop_diseases',
            'disease_reports', 'treatment_methods', 'warehouses', 'markets',
            'buyers', 'weather_stations', 'irrigation_systems', 'farm_equipment'
        ]
        
        # Process each sheet
        for sheet_name in import_order:
            if sheet_name not in excel_file.sheet_names:
                continue
            
            if sheet_name not in models_dict:
                self.stdout.write(self.style.WARNING(f"Skipping {sheet_name} - no model found"))
                continue
            
            self.stdout.write(f"Importing {sheet_name}...")
            df = pd.read_excel(excel_file, sheet_name)
            model = models_dict[sheet_name]
            
            for _, row in df.iterrows():
                data = {}
                for col in df.columns:
                    value = row[col]
                    
                    # Skip NaN values
                    if pd.isna(value):
                        continue
                    
                    # Convert column name to field name
                    field_name = col.lower().replace(' ', '_')
                    field_name = ''.join(c if c.isalnum() or c == '_' else '' for c in field_name)
                    
                    # Handle foreign keys
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
                        # Convert date strings to date objects
                        if isinstance(value, str) and '-' in value and len(value) == 10:
                            try:
                                value = datetime.strptime(value, '%Y-%m-%d').date()
                            except:
                                pass
                        data[field_name] = value
                
                # Create or update record
                try:
                    pk_field = model._meta.pk.name
                    if pk_field in data:
                        model.objects.update_or_create(defaults=data, **{pk_field: data[pk_field]})
                    else:
                        model.objects.create(**data)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Error creating record in {sheet_name}: {e}"))
        
        self.stdout.write(self.style.SUCCESS("Import completed successfully!"))