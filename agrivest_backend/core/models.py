from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator

# ========== CORE FARM MODELS ==========

class Farms(models.Model):
    farms_id = models.AutoField(primary_key=True)
    farmers_id = models.ForeignKey('Farmers', on_delete=models.SET_NULL, blank=True, null=True, related_name='farms')
    farm_name = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    lga = models.CharField(max_length=100, blank=True, null=True)
    area_hectares = models.FloatField(blank=True, null=True)
    lat = models.FloatField(blank=True, null=True)
    lon = models.FloatField(blank=True, null=True)
    geom_wkt = models.TextField(blank=True, null=True)
    land_cost_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    created_at = models.DateField(blank=True, null=True)
    updated_at = models.DateField(blank=True, null=True)

    class Meta:
        db_table = 'farms'
        verbose_name = 'Farm'
        verbose_name_plural = 'Farms'

    def __str__(self):
        return self.farm_name or f"Farm {self.farms_id}"


class FarmBlocks(models.Model):
    farm_blocks_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True, related_name='blocks')
    block_name = models.CharField(max_length=100, blank=True, null=True)
    area_hectares = models.FloatField(blank=True, null=True)
    geom_wkt = models.TextField(blank=True, null=True)
    soil_preparation_cost_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'farm_blocks'
        verbose_name = 'Farm Block'
        verbose_name_plural = 'Farm Blocks'

    def __str__(self):
        return self.block_name or f"Block {self.farm_blocks_id}"


class Farmers(models.Model):
    farmers_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.SET_NULL, blank=True, null=True, related_name='farmers')
    farm_blocks_id = models.ForeignKey(FarmBlocks, on_delete=models.SET_NULL, blank=True, null=True)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    lga = models.CharField(max_length=100, blank=True, null=True)
    registration_date = models.DateField(blank=True, null=True)

    class Meta:
        db_table = 'farmers'
        verbose_name = 'Farmer'
        verbose_name_plural = 'Farmers'

    def __str__(self):
        return f"{self.first_name or ''} {self.last_name or ''}".strip() or f"Farmer {self.farmers_id}"


class FarmWorkers(models.Model):
    ROLE_CHOICES = [
        ('FIELD_WORKER', 'Field Worker'),
        ('SUPERVISOR', 'Supervisor'),
        ('FARM_MANAGER', 'Farm Manager'),
        ('HARVESTER', 'Harvester'),
        ('EQUIPMENT_OPERATOR', 'Equipment Operator'),
    ]
    
    farm_workers_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True, related_name='workers')
    farm_blocks_id = models.ForeignKey(FarmBlocks, on_delete=models.SET_NULL, blank=True, null=True)
    name = models.CharField(max_length=100, blank=True, null=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    daily_rate_ngn = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    hire_date = models.DateField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'farm_workers'
        verbose_name = 'Farm Worker'
        verbose_name_plural = 'Farm Workers'

    def __str__(self):
        return self.name or f"Worker {self.farm_workers_id}"


class WorkerTasks(models.Model):
    worker_tasks_id = models.AutoField(primary_key=True)
    farm_workers_id = models.ForeignKey(FarmWorkers, on_delete=models.CASCADE, blank=True, null=True, related_name='tasks')
    task_description = models.TextField(blank=True, null=True)
    date_assigned = models.DateField(blank=True, null=True)
    hours_worked = models.FloatField(blank=True, null=True)
    task_cost_ngn = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    completed = models.BooleanField(default=False)
    completed_date = models.DateField(blank=True, null=True)

    class Meta:
        db_table = 'worker_tasks'
        verbose_name = 'Worker Task'
        verbose_name_plural = 'Worker Tasks'

    def __str__(self):
        return f"Task {self.worker_tasks_id}"


class WorkerPayments(models.Model):
    PAYMENT_METHODS = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CHEQUE', 'Cheque'),
        ('MOBILE_MONEY', 'Mobile Money'),
    ]
    
    worker_payments_id = models.AutoField(primary_key=True)
    farm_workers_id = models.ForeignKey(FarmWorkers, on_delete=models.CASCADE, blank=True, null=True, related_name='payments')
    payment_date = models.DateField(blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    payment_period_start = models.DateField(blank=True, null=True)
    payment_period_end = models.DateField(blank=True, null=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, blank=True, null=True)
    reference_number = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'worker_payments'
        verbose_name = 'Worker Payment'
        verbose_name_plural = 'Worker Payments'

    def __str__(self):
        return f"Payment {self.worker_payments_id}"


# ========== SOIL MANAGEMENT ==========

class SoilZones(models.Model):
    SOIL_TYPES = [
        ('LOAMY', 'Loamy'),
        ('CLAY', 'Clay'),
        ('SANDY', 'Sandy'),
        ('SILTY', 'Silty'),
    ]
    
    soil_zones_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True)
    farm_blocks_id = models.ForeignKey(FarmBlocks, on_delete=models.CASCADE, blank=True, null=True)
    soil_type = models.CharField(max_length=20, choices=SOIL_TYPES, blank=True, null=True)
    ph = models.FloatField(blank=True, null=True)
    organic_matter = models.FloatField(blank=True, null=True)

    class Meta:
        db_table = 'soil_zones'
        verbose_name = 'Soil Zone'
        verbose_name_plural = 'Soil Zones'

    def __str__(self):
        return f"{self.soil_type or 'Soil'} Zone {self.soil_zones_id}"


class SoilTests(models.Model):
    tests_id = models.AutoField(primary_key=True)
    soil_zones_id = models.ForeignKey(SoilZones, on_delete=models.CASCADE, blank=True, null=True, related_name='tests')
    nitrogen_ppm = models.FloatField(blank=True, null=True)
    phosphorus_ppm = models.FloatField(blank=True, null=True)
    potassium_ppm = models.FloatField(blank=True, null=True)
    test_date = models.DateField(blank=True, null=True)
    test_cost_ngn = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    lab_name = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'soil_tests'
        verbose_name = 'Soil Test'
        verbose_name_plural = 'Soil Tests'

    def __str__(self):
        return f"Soil Test {self.tests_id} on {self.test_date or 'unknown date'}"


# ========== CROP MANAGEMENT ==========

class Crops(models.Model):
    SEASON_CHOICES = [
        ('WET', 'Wet Season'),
        ('DRY', 'Dry Season'),
        ('PERENNIAL', 'Perennial'),
    ]
    
    crops_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True, related_name='crops')
    farm_blocks_id = models.ForeignKey(FarmBlocks, on_delete=models.CASCADE, blank=True, null=True, related_name='crops')
    crop_name = models.CharField(max_length=100, blank=True, null=True)
    season = models.CharField(max_length=20, choices=SEASON_CHOICES, blank=True, null=True)
    avg_yield_ton_ha = models.FloatField(blank=True, null=True)
    seed_cost_ngn_per_kg = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'crops'
        verbose_name = 'Crop'
        verbose_name_plural = 'Crops'

    def __str__(self):
        return self.crop_name or f"Crop {self.crops_id}"


class Plantings(models.Model):
    plantings_id = models.AutoField(primary_key=True)
    farm_blocks_id = models.ForeignKey(FarmBlocks, on_delete=models.CASCADE, blank=True, null=True, related_name='plantings')
    crops_id = models.ForeignKey(Crops, on_delete=models.CASCADE, blank=True, null=True, related_name='plantings')
    planting_date = models.DateField(blank=True, null=True)
    expected_harvest = models.DateField(blank=True, null=True)
    seed_quantity_kg = models.FloatField(blank=True, null=True)
    planting_cost_ngn = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    plant_spacing_cm = models.IntegerField(blank=True, null=True)
    row_spacing_cm = models.IntegerField(blank=True, null=True)

    class Meta:
        db_table = 'plantings'
        verbose_name = 'Planting'
        verbose_name_plural = 'Plantings'

    def __str__(self):
        return f"Planting {self.plantings_id}"


class Yields(models.Model):
    QUALITY_GRADES = [
        ('PREMIUM', 'Premium'),
        ('STANDARD', 'Standard'),
        ('BASIC', 'Basic'),
        ('REJECT', 'Rejected'),
    ]
    
    yields_id = models.AutoField(primary_key=True)
    plantings_id = models.ForeignKey(Plantings, on_delete=models.CASCADE, blank=True, null=True, related_name='yields')
    harvest_date = models.DateField(blank=True, null=True)
    yield_tons = models.FloatField(blank=True, null=True)
    harvest_cost_ngn = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    quality_grade = models.CharField(max_length=20, choices=QUALITY_GRADES, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'yields'
        verbose_name = 'Yield'
        verbose_name_plural = 'Yields'

    def __str__(self):
        return f"Yield {self.yield_tons or 0} tons"


# ========== DISEASE MANAGEMENT ==========

class CropDiseases(models.Model):
    crop_diseases_id = models.AutoField(primary_key=True)
    crops_id = models.ForeignKey(Crops, on_delete=models.CASCADE, blank=True, null=True, related_name='diseases')
    disease_name = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    symptoms = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'crop_diseases'
        verbose_name = 'Crop Disease'
        verbose_name_plural = 'Crop Diseases'

    def __str__(self):
        return self.disease_name or f"Disease {self.crop_diseases_id}"


class DiseaseReports(models.Model):
    SEVERITY_CHOICES = [
        ('MILD', 'Mild'),
        ('MODERATE', 'Moderate'),
        ('SEVERE', 'Severe'),
        ('CRITICAL', 'Critical'),
    ]
    
    reports_id = models.AutoField(primary_key=True)
    farm_blocks_id = models.ForeignKey(FarmBlocks, on_delete=models.CASCADE, blank=True, null=True, related_name='disease_reports')
    crop_diseases_id = models.ForeignKey(CropDiseases, on_delete=models.CASCADE, blank=True, null=True, related_name='reports')
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, blank=True, null=True)
    report_date = models.DateField(blank=True, null=True)
    treatment_cost_ngn = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    affected_area_hectares = models.FloatField(blank=True, null=True)

    class Meta:
        db_table = 'disease_reports'
        verbose_name = 'Disease Report'
        verbose_name_plural = 'Disease Reports'

    def __str__(self):
        return f"Report {self.reports_id} on {self.report_date or 'unknown date'}"


# ========== SATELLITE & NDVI ==========

class SatelliteImages(models.Model):
    SATELLITE_SOURCES = [
        ('SENTINEL-2', 'Sentinel-2'),
        ('LANDSAT-8', 'Landsat-8'),
        ('LANDSAT-9', 'Landsat-9'),
    ]
    
    satellite_images_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True, related_name='satellite_images')
    satellite_source = models.CharField(max_length=20, choices=SATELLITE_SOURCES, blank=True, null=True)
    capture_date = models.DateField(blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    image_cost_ngn = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'satellite_images'
        verbose_name = 'Satellite Image'
        verbose_name_plural = 'Satellite Images'

    def __str__(self):
        return f"Satellite image on {self.capture_date or 'unknown date'}"


class NdviRecords(models.Model):
    ndvi_records_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True, related_name='ndvi_records')
    capture_date = models.DateField(blank=True, null=True)
    mean_ndvi = models.FloatField(blank=True, null=True)
    min_ndvi = models.FloatField(blank=True, null=True)
    max_ndvi = models.FloatField(blank=True, null=True)

    class Meta:
        db_table = 'ndvi_records'
        verbose_name = 'NDVI Record'
        verbose_name_plural = 'NDVI Records'

    def __str__(self):
        return f"NDVI on {self.capture_date or 'unknown date'}"


# ========== WEATHER & CLIMATE ==========

class WeatherStations(models.Model):
    weather_stations_id = models.AutoField(primary_key=True)
    station_name = models.CharField(max_length=100, blank=True, null=True)
    lat = models.FloatField(blank=True, null=True)
    lon = models.FloatField(blank=True, null=True)

    class Meta:
        db_table = 'weather_stations'
        verbose_name = 'Weather Station'
        verbose_name_plural = 'Weather Stations'

    def __str__(self):
        return self.station_name or f"Station {self.weather_stations_id}"


class WeatherRecords(models.Model):
    weather_records_id = models.AutoField(primary_key=True)
    weather_stations_id = models.ForeignKey(WeatherStations, on_delete=models.CASCADE, blank=True, null=True, related_name='records')
    date = models.DateField(blank=True, null=True)
    rainfall_mm = models.FloatField(blank=True, null=True)
    temperature = models.FloatField(blank=True, null=True)
    humidity = models.FloatField(blank=True, null=True)

    class Meta:
        db_table = 'weather_records'
        verbose_name = 'Weather Record'
        verbose_name_plural = 'Weather Records'

    def __str__(self):
        return f"Weather record on {self.date or 'unknown date'}"


class ClimateEvents(models.Model):
    EVENT_TYPES = [
        ('FLOOD', 'Flood'),
        ('DROUGHT', 'Drought'),
        ('HEAVY_RAIN', 'Heavy Rain'),
        ('WINDSTORM', 'Windstorm'),
        ('EXTREME_HEAT', 'Extreme Heat'),
    ]
    
    climate_events_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True, related_name='climate_events')
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    impact = models.TextField(blank=True, null=True)
    damage_cost_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'climate_events'
        verbose_name = 'Climate Event'
        verbose_name_plural = 'Climate Events'

    def __str__(self):
        return f"{self.event_type or 'Event'} on {self.date or 'unknown date'}"


# ========== IRRIGATION ==========

class IrrigationSystems(models.Model):
    SYSTEM_TYPES = [
        ('DRIP', 'Drip Irrigation'),
        ('SPRINKLER', 'Sprinkler System'),
        ('SURFACE', 'Surface Irrigation'),
    ]
    
    WATER_SOURCES = [
        ('BOREHOLE', 'Borehole'),
        ('WELL', 'Well'),
        ('RIVER', 'River'),
        ('RESERVOIR', 'Reservoir'),
    ]
    
    irrigation_systems_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True, related_name='irrigation_systems')
    system_type = models.CharField(max_length=50, choices=SYSTEM_TYPES, blank=True, null=True)
    water_source = models.CharField(max_length=50, choices=WATER_SOURCES, blank=True, null=True)
    coverage_hectares = models.FloatField(blank=True, null=True)
    installation_cost_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'irrigation_systems'
        verbose_name = 'Irrigation System'
        verbose_name_plural = 'Irrigation Systems'

    def __str__(self):
        return f"{self.system_type or 'Irrigation'} system"


# ========== DRONE ==========

class DroneFlights(models.Model):
    DRONE_MODELS = [
        ('DJI_MAVIC', 'DJI Mavic'),
        ('DJI_PHANTOM', 'DJI Phantom'),
        ('DJI_INSPIRE', 'DJI Inspire'),
    ]
    
    drone_flights_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True, related_name='drone_flights')
    drone_model = models.CharField(max_length=50, choices=DRONE_MODELS, blank=True, null=True)
    pilot = models.CharField(max_length=100, blank=True, null=True)
    flight_date = models.DateField(blank=True, null=True)
    flight_cost_ngn = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'drone_flights'
        verbose_name = 'Drone Flight'
        verbose_name_plural = 'Drone Flights'

    def __str__(self):
        return f"Drone flight on {self.flight_date or 'unknown date'}"


# ========== WAREHOUSE ==========

class Warehouses(models.Model):
    warehouses_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    capacity_tons = models.FloatField(blank=True, null=True)
    storage_cost_per_ton_ngn = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'warehouses'
        verbose_name = 'Warehouse'
        verbose_name_plural = 'Warehouses'

    def __str__(self):
        return self.name or f"Warehouse {self.warehouses_id}"


# ========== MARKET & PRICES ==========

class Markets(models.Model):
    markets_id = models.AutoField(primary_key=True)
    market_name = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'markets'
        verbose_name = 'Market'
        verbose_name_plural = 'Markets'

    def __str__(self):
        return self.market_name or f"Market {self.markets_id}"


class MarketPrices(models.Model):
    market_prices_id = models.AutoField(primary_key=True)
    markets_id = models.ForeignKey(Markets, on_delete=models.CASCADE, blank=True, null=True, related_name='prices')
    crops_id = models.ForeignKey(Crops, on_delete=models.CASCADE, blank=True, null=True, related_name='market_prices')
    price_per_ton_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    date = models.DateField(blank=True, null=True)

    class Meta:
        db_table = 'market_prices'
        verbose_name = 'Market Price'
        verbose_name_plural = 'Market Prices'

    def __str__(self):
        return f"Price for crop {self.crops_id or 'unknown'} on {self.date or 'unknown date'}"


# ========== LOANS ==========

class Loans(models.Model):
    LOAN_STATUS = [
        ('ACTIVE', 'Active'),
        ('PAID', 'Paid'),
        ('DEFAULTED', 'Defaulted'),
        ('PENDING', 'Pending'),
    ]
    
    loans_id = models.AutoField(primary_key=True)
    farmers_id = models.ForeignKey(Farmers, on_delete=models.CASCADE, blank=True, null=True, related_name='loans')
    amount = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    interest_rate = models.FloatField(blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=LOAN_STATUS, blank=True, null=True)

    class Meta:
        db_table = 'loans'
        verbose_name = 'Loan'
        verbose_name_plural = 'Loans'

    def __str__(self):
        return f"Loan {self.loans_id}"


# ========== EXPORT ==========

class Buyers(models.Model):
    buyers_id = models.AutoField(primary_key=True)
    buyer_name = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)

    class Meta:
        db_table = 'buyers'
        verbose_name = 'Buyer'
        verbose_name_plural = 'Buyers'

    def __str__(self):
        return self.buyer_name or f"Buyer {self.buyers_id}"


class ExportShipments(models.Model):
    export_shipments_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True, related_name='exports')
    buyers_id = models.ForeignKey(Buyers, on_delete=models.CASCADE, blank=True, null=True, related_name='shipments')
    crops_id = models.ForeignKey(Crops, on_delete=models.CASCADE, blank=True, null=True)
    quantity_tons = models.FloatField(blank=True, null=True)
    export_date = models.DateField(blank=True, null=True)
    freight_cost_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    insurance_cost_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    customs_cost_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'export_shipments'
        verbose_name = 'Export Shipment'
        verbose_name_plural = 'Export Shipments'

    def __str__(self):
        return f"Shipment {self.export_shipments_id} on {self.export_date or 'unknown date'}"


# ========== EQUIPMENT ==========

class FarmEquipment(models.Model):
    EQUIPMENT_STATUS = [
        ('OPERATIONAL', 'Operational'),
        ('MAINTENANCE', 'Under Maintenance'),
        ('BROKEN', 'Broken'),
        ('RETIRED', 'Retired'),
    ]
    
    farm_equipment_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True, related_name='equipment')
    equipment_name = models.CharField(max_length=100, blank=True, null=True)
    purchase_date = models.DateField(blank=True, null=True)
    purchase_cost_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    status = models.CharField(max_length=20, choices=EQUIPMENT_STATUS, blank=True, null=True)
    manufacturer = models.CharField(max_length=100, blank=True, null=True)
    model_number = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'farm_equipment'
        verbose_name = 'Farm Equipment'
        verbose_name_plural = 'Farm Equipment'

    def __str__(self):
        return self.equipment_name or f"Equipment {self.farm_equipment_id}"


# ========== APPLICATIONS ==========

class FertilizerApplications(models.Model):
    FERTILIZER_TYPES = [
        ('NPK', 'NPK'),
        ('UREA', 'Urea'),
        ('DAP', 'DAP'),
        ('POTASH', 'Potash'),
        ('COMPOST', 'Compost'),
    ]
    
    fertilizer_applications_id = models.AutoField(primary_key=True)
    farm_blocks_id = models.ForeignKey(FarmBlocks, on_delete=models.CASCADE, blank=True, null=True, related_name='fertilizer_apps')
    fertilizer_type = models.CharField(max_length=50, choices=FERTILIZER_TYPES, blank=True, null=True)
    amount_kg = models.FloatField(blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    cost_ngn = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    application_method = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'fertilizer_applications'
        verbose_name = 'Fertilizer Application'
        verbose_name_plural = 'Fertilizer Applications'

    def __str__(self):
        return f"{self.fertilizer_type or 'Fertilizer'} on {self.date or 'unknown date'}"


class PesticideApplications(models.Model):
    PESTICIDE_TYPES = [
        ('HERBICIDE', 'Herbicide'),
        ('INSECTICIDE', 'Insecticide'),
        ('FUNGICIDE', 'Fungicide'),
        ('RODENTICIDE', 'Rodenticide'),
    ]
    
    pesticide_applications_id = models.AutoField(primary_key=True)
    farm_blocks_id = models.ForeignKey(FarmBlocks, on_delete=models.CASCADE, blank=True, null=True, related_name='pesticide_apps')
    chemical = models.CharField(max_length=100, blank=True, null=True)
    pesticide_type = models.CharField(max_length=50, choices=PESTICIDE_TYPES, blank=True, null=True)
    amount_liters = models.FloatField(blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    cost_ngn = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'pesticide_applications'
        verbose_name = 'Pesticide Application'
        verbose_name_plural = 'Pesticide Applications'

    def __str__(self):
        return f"{self.chemical or 'Pesticide'} on {self.date or 'unknown date'}"


# ========== FINANCIAL SUMMARY ==========

class FinancialSummary(models.Model):
    financial_summary_id = models.AutoField(primary_key=True)
    farms_id = models.ForeignKey(Farms, on_delete=models.CASCADE, blank=True, null=True, related_name='financial_summaries')
    crops_id = models.ForeignKey(Crops, on_delete=models.CASCADE, blank=True, null=True)
    total_yield_tons = models.FloatField(blank=True, null=True)
    avg_selling_price_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    total_revenue_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    total_costs_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    net_profit_ngn = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    roi_percentage = models.FloatField(blank=True, null=True)
    calculation_date = models.DateField(blank=True, null=True)

    class Meta:
        db_table = 'financial_summary'
        verbose_name = 'Financial Summary'
        verbose_name_plural = 'Financial Summaries'

    def __str__(self):
        return f"Financial Summary for farm {self.farms_id or 'unknown'} on {self.calculation_date or 'unknown date'}"