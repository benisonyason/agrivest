import pandas as pd
import re

def to_model_name(sheet_name: str) -> str:
    return ''.join(word.capitalize() for word in sheet_name.split('_'))

def to_field_name(col_name: str) -> str:
    return re.sub(r'[^a-zA-Z0-9_]', '', col_name).lower()

def infer_field_type(series: pd.Series, col_name: str) -> str:
    non_null = series.dropna()
    if len(non_null) == 0:
        return "models.TextField(blank=True, null=True)"
    
    # Try to detect date/time
    try:
        # If it's a datetime or looks like a date string
        if pd.api.types.is_datetime64_any_dtype(series):
            return "models.DateField(blank=True, null=True)"
        # Check if all non-null values can be parsed as dates
        test_series = pd.to_datetime(non_null, errors='coerce')
        if test_series.notna().all() and len(test_series) > 0:
            return "models.DateField(blank=True, null=True)"
    except:
        pass
    
    # Numeric detection
    if pd.api.types.is_integer_dtype(non_null):
        return "models.IntegerField(blank=True, null=True)"
    if pd.api.types.is_float_dtype(non_null):
        # Currency fields
        currency_keywords = ('cost', 'price', 'amount', 'revenue', 'profit', 'rate',
                             'value', 'loss', 'freight', 'insurance', 'customs', 'salary',)
        if any(kw in col_name.lower() for kw in currency_keywords):
            return "models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)"
        return "models.FloatField(blank=True, null=True)"
    
    # Text fields
    max_len = non_null.astype(str).str.len().max()
    if max_len < 255:
        return f"models.CharField(max_length={max_len}, blank=True, null=True)"
    return "models.TextField(blank=True, null=True)"


def generate_models_from_excel(excel_path: str) -> str:
    xl = pd.ExcelFile(excel_path)
    sheet_names = xl.sheet_names
    models_code = "from django.db import models\n\n"

    for sheet in sheet_names:
        df = pd.read_excel(xl, sheet)
        model_name = to_model_name(sheet)
        models_code += f"class {model_name}(models.Model):\n"
        columns = list(df.columns)

        for idx, col in enumerate(columns):
            field_name = to_field_name(col)
            # First column is primary key
            if idx == 0:
                models_code += f"    {field_name} = models.AutoField(primary_key=True)\n"
                continue
            # Any other column ending with '_id' is a foreign key
            if col.endswith('_id'):
                target_sheet = col[:-3]
                if target_sheet in sheet_names:
                    related_model = to_model_name(target_sheet)
                else:
                    related_model = to_model_name(target_sheet)
                if related_model == model_name:
                    models_code += f"    {field_name} = models.IntegerField(blank=True, null=True)\n"
                else:
                    models_code += f"    {field_name} = models.ForeignKey('{related_model}', on_delete=models.CASCADE, blank=True, null=True)\n"
            else:
                field_type = infer_field_type(df[col], col)
                models_code += f"    {field_name} = {field_type}\n"

        models_code += f"\n    class Meta:\n        db_table = '{sheet}'\n        verbose_name = '{model_name}'\n        verbose_name_plural = '{model_name}s'\n\n"
        # Correctly escaped __str__ method
        models_code += "    def __str__(self):\n        return f'{self.__class__.__name__} {self.pk}'\n\n"
    return models_code
