# 🌾 Agrivest - Complete Farm Management System

[![Django Version](https://img.shields.io/badge/Django-5.0.3-green.svg)](https://www.djangoproject.com/)
[![React Version](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite3-003B57.svg)](https://www.sqlite.org/)
[![API](https://img.shields.io/badge/API-REST-ff69b4.svg)](https://www.django-rest-framework.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Overview

Agrivest is a comprehensive farm management system that integrates farm operations, crop management, soil health monitoring, workforce tracking, financial analysis, and investment management. Built with Django REST Framework and React, it provides real-time analytics, interactive maps, and complete CRUD operations for all agricultural data.

### 🎯 Key Features

#### 🏠 Farm Management
- **Farm Profiles**: Track farm details, locations, sizes, and ownership
- **Interactive Maps**: View farm locations on OpenStreetMap with popup information
- **Farm Blocks**: Manage sub-divisions of farms with individual characteristics
- **Multi-farm Support**: Handle multiple farms under different investors

#### 🌱 Crop Management
- **Crop Catalog**: Complete database of crops with seasonal information
- **Planting Records**: Track planting dates, seed quantities, and spacing
- **Harvest Tracking**: Record yields, harvest costs, and quality grades
- **Crop Varieties**: Manage different varieties with maturity periods
- **Performance Analytics**: Compare actual yields against expected averages

#### 🧪 Soil Health
- **Soil Zones**: Categorize soil types (Loamy, Clay, Sandy, Silty, Peaty, Chalky)
- **Laboratory Tests**: Record N-P-K levels with optimal ranges
- **Fertility Scoring**: Automatic calculation of soil fertility (0-100%)
- **Recommendation Engine**: AI-powered recommendations for soil amendments
- **pH Analysis**: Track acidity/alkalinity with treatment suggestions

#### 👷 Workforce Management
- **Worker Profiles**: Manage employee information, roles, and daily rates
- **Task Assignment**: Track tasks, hours worked, and completion status
- **Payment Processing**: Record payments with period tracking
- **Productivity Metrics**: Calculate efficiency scores and contribution analysis
- **Role-based Access**: Different permission levels for workers

#### 💰 Investment & Finance
- **Investor Management**: Track investors (farmers as capital providers)
- **Investment Tracking**: Record amounts, interest rates, and status
- **Return on Investment**: Calculate expected returns and profit sharing
- **Payment Tracking**: Record payouts to investors with principal + interest
- **Financial Summary**: ROI percentages, profit margins, and revenue analysis
- **Loan Collateral**: Track assets securing investments

#### 📊 Advanced Analytics
- **Interactive Dashboards**: Real-time charts using Recharts
- **Yield Analysis**: By crop, farm, block, and season
- **Profit Margins**: Per crop, farm, and investment analysis
- **Trend Analysis**: Monthly, seasonal, and yearly trends
- **Efficiency Metrics**: Yield per hectare, cost per ton, revenue per hectare
- **Predictive Insights**: Yield forecasts based on historical data

#### 🗺️ Geographic Information
- **Interactive Maps**: Leaflet integration for farm visualization
- **Coordinate Tracking**: Store latitude/longitude for all farms
- **WKT Geometry**: Support for polygon boundaries
- **Map Markers**: Custom markers with popup information
- **Auto-fit Bounds**: Automatic zoom to show all farm locations
- **Multiple View Modes**: List, Map, and Split views

#### 🦠 Disease Management
- **Disease Catalog**: Track crop diseases with descriptions and symptoms
- **Outbreak Reporting**: Record disease occurrences with severity levels
- **Treatment Tracking**: Log treatment methods and costs
- **Impact Analysis**: Calculate estimated yield loss from diseases
- **Severity Mapping**: Visualize outbreak severity across farms

#### 🌤️ Environmental Monitoring
- **Weather Stations**: Track weather data from multiple stations
- **Climate Events**: Record floods, droughts, extreme heat, etc.
- **NDVI Records**: Monitor vegetation health via satellite
- **Irrigation Management**: Track water usage and system performance
- **Drone Monitoring**: Aerial imagery and analysis

#### 📦 Supply Chain
- **Warehouse Management**: Track storage capacity and inventory
- **Market Prices**: Monitor commodity prices across markets
- **Export Management**: Handle international shipments and logistics
- **Buyer Tracking**: Manage customer relationships
- **Inventory Movements**: Track inbound/outbound stock

## 🛠️ Technology Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Django** | 5.0.3 | Web framework |
| **Django REST Framework** | 3.14.0 | API development |
| **SQLite3** | - | Database (included) |
| **JWT Authentication** | 5.3.0 | Secure API access |
| **Django Filters** | 24.2 | Advanced API filtering |
| **Pandas** | 2.2.1 | Data import/export |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **Vite** | 5.0+ | Build tool |
| **React Router DOM** | 6.22+ | Navigation |
| **Axios** | 1.6+ | HTTP client |
| **Recharts** | 2.12+ | Data visualization |
| **Leaflet** | 1.9+ | Interactive maps |
| **Bootstrap** | 5.3+ | Styling |

## 📊 Database Schema

The system contains **50+ interconnected tables** organized into modules:

### Core Module (12 tables)
- `farms` - Farm information, locations, coordinates
- `farm_blocks` - Subdivisions of farms
- `farmers` - Investors/farmers profile
- `farm_workers` - Employee information
- `worker_tasks` - Task assignments
- `worker_payments` - Salary records
- `soil_zones` - Soil classification
- `soil_tests` - Laboratory analysis
- `crops` - Crop types and characteristics
- `plantings` - Planting events
- `yields` - Harvest records
- `financial_summary` - Performance metrics

### Monitoring Module (8 tables)
- `satellite_images` - Remote sensing data
- `ndvi_records` - Vegetation health index
- `weather_stations` - Weather monitoring points
- `weather_records` - Daily weather data
- `climate_events` - Extreme weather events
- `drone_flights` - Aerial monitoring missions
- `irrigation_systems` - Water management infrastructure
- `irrigation_logs` - Water usage records

### Disease Module (3 tables)
- `crop_diseases` - Disease catalog
- `disease_reports` - Outbreak reports
- `treatment_methods` - Treatment options

### Financial Module (6 tables)
- `loans` - Investment tracking
- `loan_payments` - Return payments
- `loan_collateral` - Secured assets
- `markets` - Sales markets
- `market_prices` - Price tracking
- `price_forecasts` - Price predictions

### Supply Chain Module (8 tables)
- `warehouses` - Storage facilities
- `warehouse_inventory` - Stock levels
- `inventory_movements` - Stock transactions
- `buyers` - Customer profiles
- `export_shipments` - Export logistics
- `export_routes` - Shipping routes
- `shipping_companies` - Logistics providers

### Equipment Module (5 tables)
- `farm_equipment` - Machinery inventory
- `equipment_usage_logs` - Usage tracking
- `maintenance_records` - Service history
- `fertilizer_applications` - Fertilizer usage
- `pesticide_applications` - Pesticide usage

### Security Module (2 tables)
- `cctv_locations` - Surveillance points
- `security_incidents` - Security events

## 📦 Installation

### Prerequisites
```bash
# Required versions
Python 3.11 or higher
Node.js 18 or higher
Git
