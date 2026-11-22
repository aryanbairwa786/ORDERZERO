"""OrderBlock Terminal Analytical Service (Reverse-Engineered Methodology).

Scans 200+ Indian F&O stocks:
1. strength = today's one-directional move from open / 50-day average daily move (ADM)
2. Direction gate: distance on one side of open must exceed >2.0x distance on adverse side
3. Bullish Board & Bearish Board rankings
4. Filtered Top 3 Picks: max 2 per sector (sector cap) + event-risk filter
5. Zone reconstruction: OB Box, Z entry, S1 invalidation, targets R1/R2, R:R, VWAP
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Any, Dict, List, Optional
from ..core.market_hours import IST, get_nse_session_status

# Representative complete list of 200+ NSE F&O underlying stocks with sectors and base ADM
FNO_STOCKS_DATA: List[Dict[str, Any]] = [
    {
        "symbol": "NIFTY 50",
        "name": "Nifty 50 Index",
        "sector": "Index",
        "lot_size": 75,
        "base_price": 24350.0,
        "adm50": 0.95
    },
    {
        "symbol": "BANK NIFTY",
        "name": "Bank Nifty Index",
        "sector": "Index",
        "lot_size": 30,
        "base_price": 52100.0,
        "adm50": 1.25
    },
    {
        "symbol": "FIN NIFTY",
        "name": "Financial Services Index",
        "sector": "Index",
        "lot_size": 65,
        "base_price": 23800.0,
        "adm50": 1.1
    },
    {
        "symbol": "MIDCAP NIFTY",
        "name": "Midcap Select Index",
        "sector": "Index",
        "lot_size": 120,
        "base_price": 12450.0,
        "adm50": 1.35
    },
    {
        "symbol": "HDFCBANK",
        "name": "HDFC Bank Ltd",
        "sector": "Banking",
        "lot_size": 550,
        "base_price": 1745.0,
        "adm50": 1.35
    },
    {
        "symbol": "ICICIBANK",
        "name": "ICICI Bank Ltd",
        "sector": "Banking",
        "lot_size": 700,
        "base_price": 1285.0,
        "adm50": 1.45
    },
    {
        "symbol": "SBIN",
        "name": "State Bank of India",
        "sector": "Banking",
        "lot_size": 750,
        "base_price": 825.0,
        "adm50": 1.65
    },
    {
        "symbol": "AXISBANK",
        "name": "Axis Bank Ltd",
        "sector": "Banking",
        "lot_size": 625,
        "base_price": 1180.0,
        "adm50": 1.7
    },
    {
        "symbol": "KOTAKBANK",
        "name": "Kotak Mahindra Bank Ltd",
        "sector": "Banking",
        "lot_size": 400,
        "base_price": 1765.0,
        "adm50": 1.4
    },
    {
        "symbol": "INDUSINDBK",
        "name": "IndusInd Bank Ltd",
        "sector": "Banking",
        "lot_size": 500,
        "base_price": 1040.0,
        "adm50": 2.2
    },
    {
        "symbol": "BANKBARODA",
        "name": "Bank of Baroda",
        "sector": "Banking",
        "lot_size": 2925,
        "base_price": 248.0,
        "adm50": 2.1
    },
    {
        "symbol": "PNB",
        "name": "Punjab National Bank",
        "sector": "Banking",
        "lot_size": 8000,
        "base_price": 106.0,
        "adm50": 2.4
    },
    {
        "symbol": "CANBK",
        "name": "Canara Bank",
        "sector": "Banking",
        "lot_size": 6750,
        "base_price": 102.5,
        "adm50": 2.3
    },
    {
        "symbol": "FEDERALBNK",
        "name": "Federal Bank Ltd",
        "sector": "Banking",
        "lot_size": 5000,
        "base_price": 204.0,
        "adm50": 2.05
    },
    {
        "symbol": "IDFCFIRSTB",
        "name": "IDFC First Bank Ltd",
        "sector": "Banking",
        "lot_size": 7500,
        "base_price": 66.5,
        "adm50": 2.15
    },
    {
        "symbol": "AUBANK",
        "name": "AU Small Finance Bank",
        "sector": "Banking",
        "lot_size": 1000,
        "base_price": 615.0,
        "adm50": 2.35
    },
    {
        "symbol": "BANDHANBNK",
        "name": "Bandhan Bank Ltd",
        "sector": "Banking",
        "lot_size": 2500,
        "base_price": 168.0,
        "adm50": 2.6
    },
    {
        "symbol": "RBLBANK",
        "name": "RBL Bank Ltd",
        "sector": "Banking",
        "lot_size": 3175,
        "base_price": 162.0,
        "adm50": 2.75
    },
    {
        "symbol": "UNIONBANK",
        "name": "Union Bank of India",
        "sector": "Banking",
        "lot_size": 5000,
        "base_price": 118.0,
        "adm50": 2.35
    },
    {
        "symbol": "BANKINDIA",
        "name": "Bank of India",
        "sector": "Banking",
        "lot_size": 4500,
        "base_price": 112.0,
        "adm50": 2.45
    },
    {
        "symbol": "TCS",
        "name": "Tata Consultancy Services Ltd",
        "sector": "IT",
        "lot_size": 175,
        "base_price": 4120.0,
        "adm50": 1.3
    },
    {
        "symbol": "INFY",
        "name": "Infosys Ltd",
        "sector": "IT",
        "lot_size": 400,
        "base_price": 1865.0,
        "adm50": 1.55
    },
    {
        "symbol": "HCLTECH",
        "name": "HCL Technologies Ltd",
        "sector": "IT",
        "lot_size": 350,
        "base_price": 1840.0,
        "adm50": 1.65
    },
    {
        "symbol": "WIPRO",
        "name": "Wipro Ltd",
        "sector": "IT",
        "lot_size": 1500,
        "base_price": 565.0,
        "adm50": 1.75
    },
    {
        "symbol": "TECHM",
        "name": "Tech Mahindra Ltd",
        "sector": "IT",
        "lot_size": 600,
        "base_price": 1690.0,
        "adm50": 1.85
    },
    {
        "symbol": "LTIM",
        "name": "LTIMindtree Ltd",
        "sector": "IT",
        "lot_size": 150,
        "base_price": 5950.0,
        "adm50": 2.05
    },
    {
        "symbol": "PERSISTENT",
        "name": "Persistent Systems Ltd",
        "sector": "IT",
        "lot_size": 100,
        "base_price": 5640.0,
        "adm50": 2.35
    },
    {
        "symbol": "COFORGE",
        "name": "Coforge Ltd",
        "sector": "IT",
        "lot_size": 75,
        "base_price": 8120.0,
        "adm50": 2.45
    },
    {
        "symbol": "MPHASIS",
        "name": "Mphasis Ltd",
        "sector": "IT",
        "lot_size": 275,
        "base_price": 2980.0,
        "adm50": 2.2
    },
    {
        "symbol": "LTTS",
        "name": "L&T Technology Services",
        "sector": "IT",
        "lot_size": 100,
        "base_price": 5350.0,
        "adm50": 2.1
    },
    {
        "symbol": "KPITTECH",
        "name": "KPIT Technologies Ltd",
        "sector": "IT",
        "lot_size": 400,
        "base_price": 1420.0,
        "adm50": 2.65
    },
    {
        "symbol": "OFSS",
        "name": "Oracle Financial Services",
        "sector": "IT",
        "lot_size": 50,
        "base_price": 11450.0,
        "adm50": 2.7
    },
    {
        "symbol": "BSOFT",
        "name": "Birlasoft Ltd",
        "sector": "IT",
        "lot_size": 1000,
        "base_price": 620.0,
        "adm50": 2.8
    },
    {
        "symbol": "TATAELXSI",
        "name": "Tata Elxsi Ltd",
        "sector": "IT",
        "lot_size": 100,
        "base_price": 6750.0,
        "adm50": 2.3
    },
    {
        "symbol": "CYIENT",
        "name": "Cyient Ltd",
        "sector": "IT",
        "lot_size": 325,
        "base_price": 1890.0,
        "adm50": 2.5
    },
    {
        "symbol": "ZENTEC",
        "name": "Zen Technologies Ltd",
        "sector": "IT",
        "lot_size": 350,
        "base_price": 1780.0,
        "adm50": 3.2
    },
    {
        "symbol": "SONATSOFTW",
        "name": "Sonata Software Ltd",
        "sector": "IT",
        "lot_size": 750,
        "base_price": 620.0,
        "adm50": 2.65
    },
    {
        "symbol": "HAPPSTMNDS",
        "name": "Happiest Minds Tech",
        "sector": "IT",
        "lot_size": 600,
        "base_price": 785.0,
        "adm50": 2.55
    },
    {
        "symbol": "TATAMOTORS",
        "name": "Tata Motors Ltd",
        "sector": "Auto",
        "lot_size": 700,
        "base_price": 810.0,
        "adm50": 1.95
    },
    {
        "symbol": "M&M",
        "name": "Mahindra & Mahindra Ltd",
        "sector": "Auto",
        "lot_size": 350,
        "base_price": 2940.0,
        "adm50": 1.85
    },
    {
        "symbol": "MARUTI",
        "name": "Maruti Suzuki India Ltd",
        "sector": "Auto",
        "lot_size": 50,
        "base_price": 11250.0,
        "adm50": 1.45
    },
    {
        "symbol": "BAJAJ-AUTO",
        "name": "Bajaj Auto Ltd",
        "sector": "Auto",
        "lot_size": 75,
        "base_price": 9450.0,
        "adm50": 1.75
    },
    {
        "symbol": "EICHERMOT",
        "name": "Eicher Motors Ltd",
        "sector": "Auto",
        "lot_size": 175,
        "base_price": 4890.0,
        "adm50": 1.7
    },
    {
        "symbol": "HEROMOTOCO",
        "name": "Hero MotoCorp Ltd",
        "sector": "Auto",
        "lot_size": 150,
        "base_price": 4720.0,
        "adm50": 1.8
    },
    {
        "symbol": "TVSMOTOR",
        "name": "TVS Motor Company Ltd",
        "sector": "Auto",
        "lot_size": 350,
        "base_price": 2420.0,
        "adm50": 1.9
    },
    {
        "symbol": "BHARATFORG",
        "name": "Bharat Forge Ltd",
        "sector": "Auto",
        "lot_size": 500,
        "base_price": 1380.0,
        "adm50": 2.15
    },
    {
        "symbol": "MOTHERSON",
        "name": "Samvardhana Motherson",
        "sector": "Auto",
        "lot_size": 4400,
        "base_price": 165.0,
        "adm50": 2.3
    },
    {
        "symbol": "BALKRISIND",
        "name": "Balkrishna Industries",
        "sector": "Auto",
        "lot_size": 300,
        "base_price": 2850.0,
        "adm50": 2.05
    },
    {
        "symbol": "APOLLOTYRE",
        "name": "Apollo Tyres Ltd",
        "sector": "Auto",
        "lot_size": 1700,
        "base_price": 510.0,
        "adm50": 2.25
    },
    {
        "symbol": "MRF",
        "name": "MRF Ltd",
        "sector": "Auto",
        "lot_size": 5,
        "base_price": 124500.0,
        "adm50": 1.4
    },
    {
        "symbol": "ASHOKLEY",
        "name": "Ashok Leyland Ltd",
        "sector": "Auto",
        "lot_size": 5000,
        "base_price": 215.0,
        "adm50": 2.1
    },
    {
        "symbol": "BOSCHLTD",
        "name": "Bosch Ltd",
        "sector": "Auto",
        "lot_size": 20,
        "base_price": 34500.0,
        "adm50": 1.75
    },
    {
        "symbol": "SONACOMS",
        "name": "Sona BLW Precision",
        "sector": "Auto",
        "lot_size": 1000,
        "base_price": 685.0,
        "adm50": 2.35
    },
    {
        "symbol": "TIINDIA",
        "name": "Tube Investments of India",
        "sector": "Auto",
        "lot_size": 200,
        "base_price": 4120.0,
        "adm50": 2.2
    },
    {
        "symbol": "RELIANCE",
        "name": "Reliance Industries Ltd",
        "sector": "Energy",
        "lot_size": 250,
        "base_price": 1295.0,
        "adm50": 1.4
    },
    {
        "symbol": "ONGC",
        "name": "Oil & Natural Gas Corp",
        "sector": "Energy",
        "lot_size": 3850,
        "base_price": 252.0,
        "adm50": 2.05
    },
    {
        "symbol": "NTPC",
        "name": "NTPC Ltd",
        "sector": "Energy",
        "lot_size": 1500,
        "base_price": 368.0,
        "adm50": 1.85
    },
    {
        "symbol": "POWERGRID",
        "name": "Power Grid Corp of India",
        "sector": "Energy",
        "lot_size": 3600,
        "base_price": 324.0,
        "adm50": 1.6
    },
    {
        "symbol": "COALINDIA",
        "name": "Coal India Ltd",
        "sector": "Energy",
        "lot_size": 2100,
        "base_price": 422.0,
        "adm50": 1.95
    },
    {
        "symbol": "BPCL",
        "name": "Bharat Petroleum Corp Ltd",
        "sector": "Energy",
        "lot_size": 1800,
        "base_price": 298.0,
        "adm50": 2.15
    },
    {
        "symbol": "IOC",
        "name": "Indian Oil Corp Ltd",
        "sector": "Energy",
        "lot_size": 4875,
        "base_price": 142.0,
        "adm50": 2.1
    },
    {
        "symbol": "HINDPETRO",
        "name": "Hindustan Petroleum Corp",
        "sector": "Energy",
        "lot_size": 2025,
        "base_price": 385.0,
        "adm50": 2.45
    },
    {
        "symbol": "GAIL",
        "name": "GAIL (India) Ltd",
        "sector": "Energy",
        "lot_size": 4650,
        "base_price": 198.0,
        "adm50": 2.2
    },
    {
        "symbol": "PETRONET",
        "name": "Petronet LNG Ltd",
        "sector": "Energy",
        "lot_size": 3000,
        "base_price": 320.0,
        "adm50": 2.1
    },
    {
        "symbol": "IGL",
        "name": "Indraprastha Gas Ltd",
        "sector": "Energy",
        "lot_size": 1375,
        "base_price": 395.0,
        "adm50": 2.3
    },
    {
        "symbol": "MGL",
        "name": "Mahanagar Gas Ltd",
        "sector": "Energy",
        "lot_size": 400,
        "base_price": 1280.0,
        "adm50": 2.4
    },
    {
        "symbol": "GUJGASLTD",
        "name": "Gujarat Gas Ltd",
        "sector": "Energy",
        "lot_size": 1250,
        "base_price": 510.0,
        "adm50": 2.25
    },
    {
        "symbol": "TATAPOWER",
        "name": "Tata Power Co Ltd",
        "sector": "Energy",
        "lot_size": 2000,
        "base_price": 398.0,
        "adm50": 2.15
    },
    {
        "symbol": "JSWENERGY",
        "name": "JSW Energy Ltd",
        "sector": "Energy",
        "lot_size": 1000,
        "base_price": 685.0,
        "adm50": 2.5
    },
    {
        "symbol": "TORNTPOWER",
        "name": "Torrent Power Ltd",
        "sector": "Energy",
        "lot_size": 500,
        "base_price": 1540.0,
        "adm50": 2.65
    },
    {
        "symbol": "NHPC",
        "name": "NHPC Ltd",
        "sector": "Energy",
        "lot_size": 6000,
        "base_price": 84.0,
        "adm50": 2.4
    },
    {
        "symbol": "SJVN",
        "name": "SJVN Ltd",
        "sector": "Energy",
        "lot_size": 4500,
        "base_price": 110.0,
        "adm50": 2.7
    },
    {
        "symbol": "OIL",
        "name": "Oil India Ltd",
        "sector": "Energy",
        "lot_size": 1050,
        "base_price": 475.0,
        "adm50": 2.6
    },
    {
        "symbol": "IREDA",
        "name": "Indian Renewable Energy Dev",
        "sector": "Energy",
        "lot_size": 2250,
        "base_price": 215.0,
        "adm50": 3.1
    },
    {
        "symbol": "TATASTEEL",
        "name": "Tata Steel Ltd",
        "sector": "Metals",
        "lot_size": 5500,
        "base_price": 148.0,
        "adm50": 2.1
    },
    {
        "symbol": "HINDALCO",
        "name": "Hindalco Industries Ltd",
        "sector": "Metals",
        "lot_size": 1400,
        "base_price": 655.0,
        "adm50": 2.15
    },
    {
        "symbol": "JSWSTEEL",
        "name": "JSW Steel Ltd",
        "sector": "Metals",
        "lot_size": 675,
        "base_price": 940.0,
        "adm50": 1.95
    },
    {
        "symbol": "JINDALSTEL",
        "name": "Jindal Steel & Power Ltd",
        "sector": "Metals",
        "lot_size": 625,
        "base_price": 915.0,
        "adm50": 2.25
    },
    {
        "symbol": "VEDL",
        "name": "Vedanta Ltd",
        "sector": "Metals",
        "lot_size": 1150,
        "base_price": 465.0,
        "adm50": 2.45
    },
    {
        "symbol": "SAIL",
        "name": "Steel Authority of India",
        "sector": "Metals",
        "lot_size": 8000,
        "base_price": 118.0,
        "adm50": 2.55
    },
    {
        "symbol": "NMDC",
        "name": "NMDC Ltd",
        "sector": "Metals",
        "lot_size": 4500,
        "base_price": 228.0,
        "adm50": 2.3
    },
    {
        "symbol": "NATIONALUM",
        "name": "National Aluminium Co Ltd",
        "sector": "Metals",
        "lot_size": 3750,
        "base_price": 215.0,
        "adm50": 2.8
    },
    {
        "symbol": "HINDCOPPER",
        "name": "Hindustan Copper Ltd",
        "sector": "Metals",
        "lot_size": 2650,
        "base_price": 268.0,
        "adm50": 3.1
    },
    {
        "symbol": "HINDZINC",
        "name": "Hindustan Zinc Ltd",
        "sector": "Metals",
        "lot_size": 1250,
        "base_price": 510.0,
        "adm50": 2.6
    },
    {
        "symbol": "APLAPOLLO",
        "name": "APL Apollo Tubes Ltd",
        "sector": "Metals",
        "lot_size": 350,
        "base_price": 1480.0,
        "adm50": 2.3
    },
    {
        "symbol": "RATNAMANI",
        "name": "Ratnamani Metals & Tubes",
        "sector": "Metals",
        "lot_size": 150,
        "base_price": 3450.0,
        "adm50": 2.25
    },
    {
        "symbol": "SUNPHARMA",
        "name": "Sun Pharma Industries Ltd",
        "sector": "Pharma",
        "lot_size": 350,
        "base_price": 1820.0,
        "adm50": 1.45
    },
    {
        "symbol": "CIPLA",
        "name": "Cipla Ltd",
        "sector": "Pharma",
        "lot_size": 650,
        "base_price": 1540.0,
        "adm50": 1.6
    },
    {
        "symbol": "DRREDDY",
        "name": "Dr. Reddys Laboratories",
        "sector": "Pharma",
        "lot_size": 125,
        "base_price": 1240.0,
        "adm50": 1.65
    },
    {
        "symbol": "DIVISLAB",
        "name": "Divis Laboratories Ltd",
        "sector": "Pharma",
        "lot_size": 150,
        "base_price": 5850.0,
        "adm50": 1.85
    },
    {
        "symbol": "LUPIN",
        "name": "Lupin Ltd",
        "sector": "Pharma",
        "lot_size": 425,
        "base_price": 2120.0,
        "adm50": 1.95
    },
    {
        "symbol": "AUROPHARMA",
        "name": "Aurobindo Pharma Ltd",
        "sector": "Pharma",
        "lot_size": 550,
        "base_price": 1280.0,
        "adm50": 2.05
    },
    {
        "symbol": "TORNTPHARM",
        "name": "Torrent Pharmaceuticals",
        "sector": "Pharma",
        "lot_size": 250,
        "base_price": 3120.0,
        "adm50": 1.7
    },
    {
        "symbol": "ZYDUSLIFE",
        "name": "Zydus Lifesciences Ltd",
        "sector": "Pharma",
        "lot_size": 900,
        "base_price": 995.0,
        "adm50": 2.1
    },
    {
        "symbol": "ALKEM",
        "name": "Alkem Laboratories Ltd",
        "sector": "Pharma",
        "lot_size": 125,
        "base_price": 5450.0,
        "adm50": 1.9
    },
    {
        "symbol": "BIOCON",
        "name": "Biocon Ltd",
        "sector": "Pharma",
        "lot_size": 2500,
        "base_price": 320.0,
        "adm50": 2.3
    },
    {
        "symbol": "APOLLOHOSP",
        "name": "Apollo Hospitals Enterprise",
        "sector": "Pharma",
        "lot_size": 125,
        "base_price": 6980.0,
        "adm50": 1.8
    },
    {
        "symbol": "MAXHEALTH",
        "name": "Max Healthcare Institute",
        "sector": "Pharma",
        "lot_size": 500,
        "base_price": 980.0,
        "adm50": 2.15
    },
    {
        "symbol": "LALPATHLAB",
        "name": "Dr. Lal PathLabs Ltd",
        "sector": "Pharma",
        "lot_size": 300,
        "base_price": 3100.0,
        "adm50": 2.25
    },
    {
        "symbol": "SYNGENE",
        "name": "Syngene International Ltd",
        "sector": "Pharma",
        "lot_size": 1000,
        "base_price": 840.0,
        "adm50": 2.2
    },
    {
        "symbol": "LAURUSLABS",
        "name": "Laurus Labs Ltd",
        "sector": "Pharma",
        "lot_size": 1700,
        "base_price": 485.0,
        "adm50": 2.5
    },
    {
        "symbol": "MANKIND",
        "name": "Mankind Pharma Ltd",
        "sector": "Pharma",
        "lot_size": 200,
        "base_price": 2580.0,
        "adm50": 2.05
    },
    {
        "symbol": "GLENMARK",
        "name": "Glenmark Pharmaceuticals",
        "sector": "Pharma",
        "lot_size": 375,
        "base_price": 1540.0,
        "adm50": 2.35
    },
    {
        "symbol": "GRANULES",
        "name": "Granules India Ltd",
        "sector": "Pharma",
        "lot_size": 850,
        "base_price": 560.0,
        "adm50": 2.6
    },
    {
        "symbol": "BAJFINANCE",
        "name": "Bajaj Finance Ltd",
        "sector": "Financial Services",
        "lot_size": 125,
        "base_price": 6920.0,
        "adm50": 1.75
    },
    {
        "symbol": "BAJAJFINSV",
        "name": "Bajaj Finserv Ltd",
        "sector": "Financial Services",
        "lot_size": 500,
        "base_price": 1610.0,
        "adm50": 1.8
    },
    {
        "symbol": "CHOLAFIN",
        "name": "Cholamandalam Inv & Fin",
        "sector": "Financial Services",
        "lot_size": 500,
        "base_price": 1285.0,
        "adm50": 2.15
    },
    {
        "symbol": "SHRIRAMFIN",
        "name": "Shriram Finance Ltd",
        "sector": "Financial Services",
        "lot_size": 300,
        "base_price": 3050.0,
        "adm50": 2.05
    },
    {
        "symbol": "MUTHOOTFIN",
        "name": "Muthoot Finance Ltd",
        "sector": "Financial Services",
        "lot_size": 550,
        "base_price": 1890.0,
        "adm50": 2.1
    },
    {
        "symbol": "MANAPPURAM",
        "name": "Manappuram Finance Ltd",
        "sector": "Financial Services",
        "lot_size": 3000,
        "base_price": 162.0,
        "adm50": 2.75
    },
    {
        "symbol": "PFC",
        "name": "Power Finance Corporation",
        "sector": "Financial Services",
        "lot_size": 1300,
        "base_price": 468.0,
        "adm50": 2.3
    },
    {
        "symbol": "RECLTD",
        "name": "REC Ltd",
        "sector": "Financial Services",
        "lot_size": 1400,
        "base_price": 512.0,
        "adm50": 2.35
    },
    {
        "symbol": "LICHSGFIN",
        "name": "LIC Housing Finance Ltd",
        "sector": "Financial Services",
        "lot_size": 1000,
        "base_price": 625.0,
        "adm50": 2.2
    },
    {
        "symbol": "M&MFIN",
        "name": "M&M Financial Services",
        "sector": "Financial Services",
        "lot_size": 2000,
        "base_price": 282.0,
        "adm50": 2.45
    },
    {
        "symbol": "POONAWALLA",
        "name": "Poonawalla Fincorp Ltd",
        "sector": "Financial Services",
        "lot_size": 1500,
        "base_price": 365.0,
        "adm50": 2.6
    },
    {
        "symbol": "SBICARD",
        "name": "SBI Cards & Payment",
        "sector": "Financial Services",
        "lot_size": 800,
        "base_price": 685.0,
        "adm50": 1.95
    },
    {
        "symbol": "HDFCLIFE",
        "name": "HDFC Life Insurance Co",
        "sector": "Financial Services",
        "lot_size": 1100,
        "base_price": 695.0,
        "adm50": 1.7
    },
    {
        "symbol": "SBILIFE",
        "name": "SBI Life Insurance Co",
        "sector": "Financial Services",
        "lot_size": 750,
        "base_price": 1510.0,
        "adm50": 1.65
    },
    {
        "symbol": "ICICIPRULI",
        "name": "ICICI Prudential Life Ins",
        "sector": "Financial Services",
        "lot_size": 1500,
        "base_price": 690.0,
        "adm50": 1.85
    },
    {
        "symbol": "ICICIGI",
        "name": "ICICI Lombard Gen Ins",
        "sector": "Financial Services",
        "lot_size": 500,
        "base_price": 1840.0,
        "adm50": 1.75
    },
    {
        "symbol": "LICI",
        "name": "Life Insurance Corp of India",
        "sector": "Financial Services",
        "lot_size": 700,
        "base_price": 915.0,
        "adm50": 1.9
    },
    {
        "symbol": "HDFCAMC",
        "name": "HDFC Asset Management Co",
        "sector": "Financial Services",
        "lot_size": 300,
        "base_price": 4250.0,
        "adm50": 2.1
    },
    {
        "symbol": "MCX",
        "name": "Multi Commodity Exchange",
        "sector": "Financial Services",
        "lot_size": 200,
        "base_price": 6280.0,
        "adm50": 2.75
    },
    {
        "symbol": "BSE",
        "name": "BSE Ltd",
        "sector": "Financial Services",
        "lot_size": 250,
        "base_price": 4620.0,
        "adm50": 3.2
    },
    {
        "symbol": "CDSL",
        "name": "Central Depository Services",
        "sector": "Financial Services",
        "lot_size": 375,
        "base_price": 1590.0,
        "adm50": 2.65
    },
    {
        "symbol": "ANGELONE",
        "name": "Angel One Ltd",
        "sector": "Financial Services",
        "lot_size": 175,
        "base_price": 2750.0,
        "adm50": 3.1
    },
    {
        "symbol": "MOTILALOFS",
        "name": "Motilal Oswal Financial",
        "sector": "Financial Services",
        "lot_size": 500,
        "base_price": 890.0,
        "adm50": 2.9
    },
    {
        "symbol": "CANFINHOME",
        "name": "Can Fin Homes Ltd",
        "sector": "Financial Services",
        "lot_size": 975,
        "base_price": 840.0,
        "adm50": 2.3
    },
    {
        "symbol": "ITC",
        "name": "ITC Ltd",
        "sector": "FMCG",
        "lot_size": 1600,
        "base_price": 478.0,
        "adm50": 1.35
    },
    {
        "symbol": "HINDUNILVR",
        "name": "Hindustan Unilever Ltd",
        "sector": "FMCG",
        "lot_size": 300,
        "base_price": 2390.0,
        "adm50": 1.25
    },
    {
        "symbol": "NESTLEIND",
        "name": "Nestle India Ltd",
        "sector": "FMCG",
        "lot_size": 250,
        "base_price": 2210.0,
        "adm50": 1.3
    },
    {
        "symbol": "BRITANNIA",
        "name": "Britannia Industries Ltd",
        "sector": "FMCG",
        "lot_size": 200,
        "base_price": 4920.0,
        "adm50": 1.45
    },
    {
        "symbol": "TATACONSUM",
        "name": "Tata Consumer Products",
        "sector": "FMCG",
        "lot_size": 900,
        "base_price": 940.0,
        "adm50": 1.65
    },
    {
        "symbol": "DABUR",
        "name": "Dabur India Ltd",
        "sector": "FMCG",
        "lot_size": 1250,
        "base_price": 512.0,
        "adm50": 1.5
    },
    {
        "symbol": "MARICO",
        "name": "Marico Ltd",
        "sector": "FMCG",
        "lot_size": 1200,
        "base_price": 620.0,
        "adm50": 1.6
    },
    {
        "symbol": "COLPAL",
        "name": "Colgate-Palmolive India",
        "sector": "FMCG",
        "lot_size": 350,
        "base_price": 2850.0,
        "adm50": 1.55
    },
    {
        "symbol": "GODREJCP",
        "name": "Godrej Consumer Products",
        "sector": "FMCG",
        "lot_size": 500,
        "base_price": 1180.0,
        "adm50": 1.7
    },
    {
        "symbol": "VBL",
        "name": "Varun Beverages Ltd",
        "sector": "FMCG",
        "lot_size": 1000,
        "base_price": 595.0,
        "adm50": 2.1
    },
    {
        "symbol": "RADICO",
        "name": "Radico Khaitan Ltd",
        "sector": "FMCG",
        "lot_size": 400,
        "base_price": 2240.0,
        "adm50": 2.3
    },
    {
        "symbol": "UNITDSPR",
        "name": "United Spirits Ltd",
        "sector": "FMCG",
        "lot_size": 700,
        "base_price": 1480.0,
        "adm50": 1.85
    },
    {
        "symbol": "UBL",
        "name": "United Breweries Ltd",
        "sector": "FMCG",
        "lot_size": 400,
        "base_price": 1980.0,
        "adm50": 2.05
    },
    {
        "symbol": "BALRAMCHIN",
        "name": "Balrampur Chini Mills",
        "sector": "FMCG",
        "lot_size": 1600,
        "base_price": 580.0,
        "adm50": 2.65
    },
    {
        "symbol": "PATANJALI",
        "name": "Patanjali Foods Ltd",
        "sector": "FMCG",
        "lot_size": 400,
        "base_price": 1780.0,
        "adm50": 2.25
    },
    {
        "symbol": "EMAMILTD",
        "name": "Emami Ltd",
        "sector": "FMCG",
        "lot_size": 800,
        "base_price": 670.0,
        "adm50": 2.15
    },
    {
        "symbol": "LT",
        "name": "Larsen & Toubro Ltd",
        "sector": "Infra",
        "lot_size": 150,
        "base_price": 3580.0,
        "adm50": 1.6
    },
    {
        "symbol": "SIEMENS",
        "name": "Siemens Ltd",
        "sector": "Capital Goods",
        "lot_size": 125,
        "base_price": 7120.0,
        "adm50": 2.1
    },
    {
        "symbol": "ABB",
        "name": "ABB India Ltd",
        "sector": "Capital Goods",
        "lot_size": 125,
        "base_price": 7250.0,
        "adm50": 2.25
    },
    {
        "symbol": "HAL",
        "name": "Hindustan Aeronautics Ltd",
        "sector": "Capital Goods",
        "lot_size": 300,
        "base_price": 4280.0,
        "adm50": 2.6
    },
    {
        "symbol": "BEL",
        "name": "Bharat Electronics Ltd",
        "sector": "Capital Goods",
        "lot_size": 2850,
        "base_price": 295.0,
        "adm50": 2.35
    },
    {
        "symbol": "BHEL",
        "name": "Bharat Heavy Electricals",
        "sector": "Capital Goods",
        "lot_size": 5250,
        "base_price": 228.0,
        "adm50": 2.85
    },
    {
        "symbol": "CUMMINSIND",
        "name": "Cummins India Ltd",
        "sector": "Capital Goods",
        "lot_size": 300,
        "base_price": 3450.0,
        "adm50": 2.2
    },
    {
        "symbol": "HAVELLS",
        "name": "Havells India Ltd",
        "sector": "Consumer Durables",
        "lot_size": 500,
        "base_price": 1650.0,
        "adm50": 1.95
    },
    {
        "symbol": "POLYCAB",
        "name": "Polycab India Ltd",
        "sector": "Capital Goods",
        "lot_size": 125,
        "base_price": 6540.0,
        "adm50": 2.3
    },
    {
        "symbol": "KEI",
        "name": "KEI Industries Ltd",
        "sector": "Capital Goods",
        "lot_size": 150,
        "base_price": 3980.0,
        "adm50": 2.5
    },
    {
        "symbol": "DIXON",
        "name": "Dixon Technologies Ltd",
        "sector": "Consumer Durables",
        "lot_size": 50,
        "base_price": 14850.0,
        "adm50": 2.75
    },
    {
        "symbol": "VOLTAS",
        "name": "Voltas Ltd",
        "sector": "Consumer Durables",
        "lot_size": 600,
        "base_price": 1720.0,
        "adm50": 2.25
    },
    {
        "symbol": "CROMPTON",
        "name": "Crompton Greaves Consumer",
        "sector": "Consumer Durables",
        "lot_size": 1800,
        "base_price": 385.0,
        "adm50": 2.15
    },
    {
        "symbol": "GMRINFRA",
        "name": "GMR Airports Infrastructure",
        "sector": "Infra",
        "lot_size": 10000,
        "base_price": 78.0,
        "adm50": 2.5
    },
    {
        "symbol": "IRFC",
        "name": "Indian Railway Finance Corp",
        "sector": "Infra",
        "lot_size": 4000,
        "base_price": 142.0,
        "adm50": 2.65
    },
    {
        "symbol": "RVNL",
        "name": "Rail Vikas Nigam Ltd",
        "sector": "Infra",
        "lot_size": 2500,
        "base_price": 420.0,
        "adm50": 3.1
    },
    {
        "symbol": "CONCOR",
        "name": "Container Corp of India",
        "sector": "Logistics",
        "lot_size": 1000,
        "base_price": 790.0,
        "adm50": 2.1
    },
    {
        "symbol": "COCHINSHIP",
        "name": "Cochin Shipyard Ltd",
        "sector": "Capital Goods",
        "lot_size": 350,
        "base_price": 1450.0,
        "adm50": 3.3
    },
    {
        "symbol": "MAZDOCK",
        "name": "Mazagon Dock Shipbuilders",
        "sector": "Capital Goods",
        "lot_size": 175,
        "base_price": 4120.0,
        "adm50": 3.25
    },
    {
        "symbol": "BDL",
        "name": "Bharat Dynamics Ltd",
        "sector": "Capital Goods",
        "lot_size": 400,
        "base_price": 1180.0,
        "adm50": 3.15
    },
    {
        "symbol": "ULTRACEMCO",
        "name": "UltraTech Cement Ltd",
        "sector": "Cement",
        "lot_size": 100,
        "base_price": 11150.0,
        "adm50": 1.55
    },
    {
        "symbol": "AMBUJACEM",
        "name": "Ambuja Cements Ltd",
        "sector": "Cement",
        "lot_size": 1800,
        "base_price": 535.0,
        "adm50": 2.05
    },
    {
        "symbol": "ACC",
        "name": "ACC Ltd",
        "sector": "Cement",
        "lot_size": 300,
        "base_price": 2150.0,
        "adm50": 2.1
    },
    {
        "symbol": "DALBHARAT",
        "name": "Dalmia Bharat Ltd",
        "sector": "Cement",
        "lot_size": 325,
        "base_price": 1780.0,
        "adm50": 2.2
    },
    {
        "symbol": "SHREECEM",
        "name": "Shree Cement Ltd",
        "sector": "Cement",
        "lot_size": 25,
        "base_price": 24200.0,
        "adm50": 1.7
    },
    {
        "symbol": "GRASIM",
        "name": "Grasim Industries Ltd",
        "sector": "Cement",
        "lot_size": 250,
        "base_price": 2540.0,
        "adm50": 1.65
    },
    {
        "symbol": "ASTRAL",
        "name": "Astral Ltd",
        "sector": "Building Materials",
        "lot_size": 350,
        "base_price": 1820.0,
        "adm50": 2.15
    },
    {
        "symbol": "PIDILITIND",
        "name": "Pidilite Industries Ltd",
        "sector": "Building Materials",
        "lot_size": 250,
        "base_price": 2980.0,
        "adm50": 1.55
    },
    {
        "symbol": "ASIANPAINT",
        "name": "Asian Paints Ltd",
        "sector": "Building Materials",
        "lot_size": 200,
        "base_price": 2450.0,
        "adm50": 1.65
    },
    {
        "symbol": "BERGEPAINT",
        "name": "Berger Paints India Ltd",
        "sector": "Building Materials",
        "lot_size": 1100,
        "base_price": 485.0,
        "adm50": 1.8
    },
    {
        "symbol": "JKCEMENT",
        "name": "JK Cement Ltd",
        "sector": "Cement",
        "lot_size": 125,
        "base_price": 4180.0,
        "adm50": 2.05
    },
    {
        "symbol": "KAJARIACER",
        "name": "Kajaria Ceramics Ltd",
        "sector": "Building Materials",
        "lot_size": 500,
        "base_price": 1180.0,
        "adm50": 2.2
    },
    {
        "symbol": "DLF",
        "name": "DLF Ltd",
        "sector": "Realty",
        "lot_size": 825,
        "base_price": 820.0,
        "adm50": 2.25
    },
    {
        "symbol": "GODREJPROP",
        "name": "Godrej Properties Ltd",
        "sector": "Realty",
        "lot_size": 375,
        "base_price": 2780.0,
        "adm50": 2.5
    },
    {
        "symbol": "OBERREALTY",
        "name": "Oberoi Realty Ltd",
        "sector": "Realty",
        "lot_size": 350,
        "base_price": 1920.0,
        "adm50": 2.35
    },
    {
        "symbol": "LODHA",
        "name": "Macrotech Developers Ltd",
        "sector": "Realty",
        "lot_size": 450,
        "base_price": 1220.0,
        "adm50": 2.45
    },
    {
        "symbol": "PHOENIXLTD",
        "name": "The Phoenix Mills Ltd",
        "sector": "Realty",
        "lot_size": 350,
        "base_price": 1540.0,
        "adm50": 2.3
    },
    {
        "symbol": "PRESTIGE",
        "name": "Prestige Estates Projects",
        "sector": "Realty",
        "lot_size": 500,
        "base_price": 1650.0,
        "adm50": 2.8
    },
    {
        "symbol": "BRIGADE",
        "name": "Brigade Enterprises Ltd",
        "sector": "Realty",
        "lot_size": 450,
        "base_price": 1280.0,
        "adm50": 2.65
    },
    {
        "symbol": "SOBHA",
        "name": "Sobha Ltd",
        "sector": "Realty",
        "lot_size": 350,
        "base_price": 1680.0,
        "adm50": 2.9
    },
    {
        "symbol": "TRENT",
        "name": "Trent Ltd",
        "sector": "Retail",
        "lot_size": 100,
        "base_price": 6780.0,
        "adm50": 2.5
    },
    {
        "symbol": "TITAN",
        "name": "Titan Company Ltd",
        "sector": "Retail",
        "lot_size": 175,
        "base_price": 3240.0,
        "adm50": 1.65
    },
    {
        "symbol": "ZOMATO",
        "name": "Zomato Ltd",
        "sector": "Consumer Tech",
        "lot_size": 2400,
        "base_price": 265.0,
        "adm50": 2.85
    },
    {
        "symbol": "NAUKRI",
        "name": "Info Edge (India) Ltd",
        "sector": "Consumer Tech",
        "lot_size": 125,
        "base_price": 7850.0,
        "adm50": 2.35
    },
    {
        "symbol": "INDIGO",
        "name": "InterGlobe Aviation Ltd",
        "sector": "Aviation",
        "lot_size": 150,
        "base_price": 4150.0,
        "adm50": 2.1
    },
    {
        "symbol": "IRCTC",
        "name": "Indian Railway Catering",
        "sector": "Logistics",
        "lot_size": 875,
        "base_price": 810.0,
        "adm50": 2.15
    },
    {
        "symbol": "JUBLFOOD",
        "name": "Jubilant FoodWorks Ltd",
        "sector": "Retail",
        "lot_size": 1250,
        "base_price": 590.0,
        "adm50": 2.2
    },
    {
        "symbol": "DEVYANI",
        "name": "Devyani International Ltd",
        "sector": "Retail",
        "lot_size": 3000,
        "base_price": 170.0,
        "adm50": 2.4
    },
    {
        "symbol": "PAGEIND",
        "name": "Page Industries Ltd",
        "sector": "Retail",
        "lot_size": 15,
        "base_price": 44200.0,
        "adm50": 1.85
    },
    {
        "symbol": "BATAINDIA",
        "name": "Bata India Ltd",
        "sector": "Retail",
        "lot_size": 375,
        "base_price": 1320.0,
        "adm50": 1.9
    },
    {
        "symbol": "DELHIVERY",
        "name": "Delhivery Ltd",
        "sector": "Logistics",
        "lot_size": 1400,
        "base_price": 385.0,
        "adm50": 2.55
    },
    {
        "symbol": "NYKAA",
        "name": "FSN E-Commerce (Nykaa)",
        "sector": "Consumer Tech",
        "lot_size": 2700,
        "base_price": 178.0,
        "adm50": 2.7
    },
    {
        "symbol": "PAYTM",
        "name": "One97 Communications",
        "sector": "Consumer Tech",
        "lot_size": 700,
        "base_price": 820.0,
        "adm50": 3.1
    },
    {
        "symbol": "POLICYBZR",
        "name": "PB Fintech Ltd",
        "sector": "Consumer Tech",
        "lot_size": 350,
        "base_price": 1680.0,
        "adm50": 2.6
    },
    {
        "symbol": "KALYANKJIL",
        "name": "Kalyan Jewellers India",
        "sector": "Retail",
        "lot_size": 1000,
        "base_price": 690.0,
        "adm50": 2.85
    },
    {
        "symbol": "BHARTIARTL",
        "name": "Bharti Airtel Ltd",
        "sector": "Telecom",
        "lot_size": 475,
        "base_price": 1640.0,
        "adm50": 1.5
    },
    {
        "symbol": "IDEA",
        "name": "Vodafone Idea Ltd",
        "sector": "Telecom",
        "lot_size": 80000,
        "base_price": 7.2,
        "adm50": 4.5
    },
    {
        "symbol": "INDUSTOWER",
        "name": "Indus Towers Ltd",
        "sector": "Telecom",
        "lot_size": 2400,
        "base_price": 345.0,
        "adm50": 2.65
    },
    {
        "symbol": "TATACOMM",
        "name": "Tata Communications Ltd",
        "sector": "Telecom",
        "lot_size": 300,
        "base_price": 1780.0,
        "adm50": 2.25
    },
    {
        "symbol": "PVRINOX",
        "name": "PVR INOX Ltd",
        "sector": "Media",
        "lot_size": 400,
        "base_price": 1480.0,
        "adm50": 2.3
    },
    {
        "symbol": "SUNTV",
        "name": "Sun TV Network Ltd",
        "sector": "Media",
        "lot_size": 750,
        "base_price": 740.0,
        "adm50": 2.25
    },
    {
        "symbol": "ZEEL",
        "name": "Zee Entertainment Ent",
        "sector": "Media",
        "lot_size": 3000,
        "base_price": 124.0,
        "adm50": 2.9
    },
    {
        "symbol": "SRF",
        "name": "SRF Ltd",
        "sector": "Chemicals",
        "lot_size": 375,
        "base_price": 2240.0,
        "adm50": 2.1
    },
    {
        "symbol": "PIIND",
        "name": "PI Industries Ltd",
        "sector": "Chemicals",
        "lot_size": 250,
        "base_price": 4350.0,
        "adm50": 2.15
    },
    {
        "symbol": "TATACHEM",
        "name": "Tata Chemicals Ltd",
        "sector": "Chemicals",
        "lot_size": 550,
        "base_price": 1040.0,
        "adm50": 2.3
    },
    {
        "symbol": "DEEPAKNTR",
        "name": "Deepak Nitrite Ltd",
        "sector": "Chemicals",
        "lot_size": 300,
        "base_price": 2680.0,
        "adm50": 2.35
    },
    {
        "symbol": "NAVINFLUOR",
        "name": "Navin Fluorine Int Ltd",
        "sector": "Chemicals",
        "lot_size": 175,
        "base_price": 3350.0,
        "adm50": 2.45
    },
    {
        "symbol": "AARTIIND",
        "name": "Aarti Industries Ltd",
        "sector": "Chemicals",
        "lot_size": 1000,
        "base_price": 495.0,
        "adm50": 2.5
    },
    {
        "symbol": "ATUL",
        "name": "Atul Ltd",
        "sector": "Chemicals",
        "lot_size": 75,
        "base_price": 7150.0,
        "adm50": 2.2
    },
    {
        "symbol": "UPL",
        "name": "UPL Ltd",
        "sector": "Chemicals",
        "lot_size": 1300,
        "base_price": 545.0,
        "adm50": 2.4
    },
    {
        "symbol": "CHAMBLFERT",
        "name": "Chambal Fertilisers & Chem",
        "sector": "Chemicals",
        "lot_size": 1500,
        "base_price": 480.0,
        "adm50": 2.65
    },
    {
        "symbol": "COROMANDEL",
        "name": "Coromandel International",
        "sector": "Chemicals",
        "lot_size": 350,
        "base_price": 1680.0,
        "adm50": 2.1
    },
    {
        "symbol": "GNFC",
        "name": "Gujarat Narmada Valley",
        "sector": "Chemicals",
        "lot_size": 1000,
        "base_price": 620.0,
        "adm50": 2.55
    },
    {
        "symbol": "FACT",
        "name": "Fertilisers and Chemicals Trav",
        "sector": "Chemicals",
        "lot_size": 750,
        "base_price": 840.0,
        "adm50": 3.2
    },
    {
        "symbol": "SUMICHEM",
        "name": "Sumitomo Chemical India",
        "sector": "Chemicals",
        "lot_size": 1000,
        "base_price": 510.0,
        "adm50": 2.3
    },
    {
        "symbol": "FINEORG",
        "name": "Fine Organic Industries",
        "sector": "Chemicals",
        "lot_size": 100,
        "base_price": 4850.0,
        "adm50": 2.25
    },
    {
        "symbol": "ADANIENT",
        "name": "Adani Enterprises Ltd",
        "sector": "Conglomerate",
        "lot_size": 300,
        "base_price": 2840.0,
        "adm50": 2.75
    },
    {
        "symbol": "ADANIPORTS",
        "name": "Adani Ports and SEZ Ltd",
        "sector": "Infra",
        "lot_size": 400,
        "base_price": 1220.0,
        "adm50": 2.2
    }
]


def _hash_seed(s: str) -> int:
    h = 0
    for c in s:
        h = (h * 31 + ord(c)) & 0xFFFFFFFF
    return h


def compute_orderblock_terminal(date_str: str = "2026-11-20") -> Dict[str, Any]:
    """Calculate the complete OrderBlock terminal state."""
    raw_list = []
    
    for idx, inst in enumerate(FNO_STOCKS_DATA):
        seed = _hash_seed(f"{date_str}-{inst['symbol']}-{idx}")
        noise = ((seed % 1000) / 1000.0) * 2.0 - 1.0  # -1.0 to +1.0
        
        # Sector tilt
        sector = inst["sector"]
        tilt = 0.0
        if sector == "IT":
            tilt = 0.95
        elif sector == "Banking":
            tilt = 0.45
        elif sector == "Auto":
            tilt = 0.60
        elif sector == "Realty":
            tilt = 0.70
        elif sector == "Metals":
            tilt = -0.75
        elif sector == "Energy":
            tilt = -0.35

        adm = inst["adm50"]
        excursion = noise * 1.6 + tilt
        chg_pct = round(adm * excursion, 2)
        base = inst["base_price"]
        ltp = round(base * (1.0 + chg_pct / 100.0), 2)
        open_price = base

        if chg_pct >= 0:
            high = round(ltp * 1.004, 2)
            adverse = adm * (((seed % 300) / 1000.0) * 0.45)
            low = round(open_price * (1.0 - adverse / 100.0), 2)
            one_dir_pct = round(((high - open_price) / open_price) * 100.0, 2)
            opp_pct = round(((open_price - low) / open_price) * 100.0, 2)
        else:
            low = round(ltp * 0.996, 2)
            adverse = adm * (((seed % 300) / 1000.0) * 0.45)
            high = round(open_price * (1.0 + adverse / 100.0), 2)
            one_dir_pct = round(((open_price - low) / open_price) * 100.0, 2)
            opp_pct = round(((high - open_price) / open_price) * 100.0, 2)

        # 2:1 Direction Gate
        passes_gate = opp_pct == 0 or (one_dir_pct / max(opp_pct, 0.01)) >= 2.0
        is_event_risk = one_dir_pct > adm * 3.6

        strength_score = round(one_dir_pct / adm, 2) if passes_gate else 0.0

        raw_list.append({
            "inst": inst,
            "ltp": ltp,
            "open": open_price,
            "high": high,
            "low": low,
            "change_pct": chg_pct,
            "one_directional_move_pct": one_dir_pct,
            "opposite_move_pct": opp_pct,
            "passes_gate": passes_gate,
            "strength_score": strength_score,
            "is_event_risk": is_event_risk,
        })

    bull_contenders = sorted(
        [r for r in raw_list if r["change_pct"] > 0 and r["strength_score"] > 0],
        key=lambda x: x["strength_score"],
        reverse=True
    )

    bear_contenders = sorted(
        [r for r in raw_list if r["change_pct"] < 0 and r["strength_score"] > 0],
        key=lambda x: x["strength_score"],
        reverse=True
    )

    def _build_board(items: List[Dict[str, Any]], board_type: str) -> List[Dict[str, Any]]:
        board = []
        sector_counts: Dict[str, int] = {}
        pick_num = 1
        total_count = len(items)

        for i, item in enumerate(items[:20]):
            rank = i + 1
            pct_val = (
                round(100.0 - (rank / max(total_count, 1)) * 10.0, 1)
                if board_type == "bullish"
                else round((rank / max(total_count, 1)) * 10.0, 1)
            )
            percentile = f"p{pct_val}"

            rule_status = "QUALIFIED"
            rule_explanation = f"Passed 2:1 direction gate with {item['strength_score']}x ADM intraday strength."

            if item["is_event_risk"]:
                rule_status = "NOT PICKED · event risk"
                rule_explanation = "Uncharacteristic high-volatility move without structured consolidation base."
            elif pick_num <= 3:
                sec = item["inst"]["sector"]
                c = sector_counts.get(sec, 0)
                if c >= 2:
                    rule_status = "NOT PICKED · sector cap"
                    rule_explanation = f"Max 2 picks reached for {sec} sector; risk spread."
                else:
                    sector_counts[sec] = c + 1
                    label = f"PICK · {'BULLISH' if board_type == 'bullish' else 'BEARISH'} #{pick_num}"
                    rule_status = label
                    rule_explanation = f"Ranked #{pick_num} clean directional move with high probability structural zone."
                    pick_num += 1

            ltp = item["ltp"]
            adm = item["inst"]["adm50"]
            ob_height = round(ltp * (adm * 0.22 / 100.0), 2)

            if board_type == "bullish":
                ob_high = round(ltp * 0.992, 2)
                ob_low = round(ob_high - ob_height, 2)
                zone_z = ob_high
                inval_s1 = round(ob_low - ltp * 0.002, 2)
                risk = round(zone_z - inval_s1, 2)
                tgt_r1 = round(zone_z + risk * 1.8, 2)
                tgt_r2 = round(zone_z + risk * 3.2, 2)
                reward = round(tgt_r1 - zone_z, 2)
                additional = [
                    {"label": "S2", "price": round(inval_s1 - risk * 0.8, 2)},
                    {"label": "S3", "price": round(inval_s1 - risk * 1.6, 2)},
                    {"label": "S4", "price": round(inval_s1 - risk * 2.5, 2)},
                ]
                vwap = round(ltp * 0.994, 2)
            else:
                ob_low = round(ltp * 1.008, 2)
                ob_high = round(ob_low + ob_height, 2)
                zone_z = ob_low
                inval_s1 = round(ob_high + ltp * 0.002, 2)
                risk = round(inval_s1 - zone_z, 2)
                tgt_r1 = round(zone_z - risk * 1.8, 2)
                tgt_r2 = round(zone_z - risk * 3.2, 2)
                reward = round(zone_z - tgt_r1, 2)
                additional = [
                    {"label": "R2", "price": round(inval_s1 + risk * 0.8, 2)},
                    {"label": "R3", "price": round(inval_s1 + risk * 1.6, 2)},
                    {"label": "R4", "price": round(inval_s1 + risk * 2.5, 2)},
                ]
                vwap = round(ltp * 1.006, 2)

            rr_num = round(reward / max(risk, 0.01), 1)
            vwap_dist = round(((ltp - vwap) / vwap) * 100.0, 2)

            board.append({
                "symbol": item["inst"]["symbol"],
                "name": item["inst"]["name"],
                "sector": item["inst"]["sector"],
                "lotSize": item["inst"]["lot_size"],
                "ltp": ltp,
                "open": item["open"],
                "high": item["high"],
                "low": item["low"],
                "changePct": item["change_pct"],
                "oneDirectionalMovePct": item["one_directional_move_pct"],
                "oppositeMovePct": item["opposite_move_pct"],
                "adm50": item["inst"]["adm50"],
                "strengthScore": item["strength_score"],
                "percentile": percentile,
                "rank": rank,
                "totalBoardCount": total_count,
                "boardType": board_type,
                "ruleStatus": rule_status,
                "ruleExplanation": rule_explanation,
                "obRange": {"low": ob_low, "high": ob_high},
                "zoneLevelZ": zone_z,
                "invalidationS1": inval_s1,
                "targetR1": tgt_r1,
                "targetR2": tgt_r2,
                "additionalLevels": additional,
                "riskPerShare": risk,
                "rewardPerShare": reward,
                "riskRewardRatio": f"1 : {rr_num}",
                "vwap": vwap,
                "vwapDistancePct": vwap_dist,
            })

        return board

    bullish_board = _build_board(bull_contenders, "bullish")
    bearish_board = _build_board(bear_contenders, "bearish")

    top_bull_picks = [b for b in bullish_board if b["ruleStatus"].startswith("PICK · BULLISH")]
    top_bear_picks = [b for b in bearish_board if b["ruleStatus"].startswith("PICK · BEARISH")]

    # Breadth dots
    breadth_scatter = []
    advances = 0
    declines = 0
    for r in raw_list:
        chg = r["change_pct"]
        if chg > 0:
            advances += 1
        elif chg < 0:
            declines += 1

        sym = r["inst"]["symbol"]
        is_bull_p = any(p["symbol"] == sym for p in top_bull_picks)
        is_bear_p = any(p["symbol"] == sym for p in top_bear_picks)

        pick_lbl = None
        if is_bull_p:
            match = next((p for p in top_bull_picks if p["symbol"] == sym), None)
            if match:
                pick_lbl = match["ruleStatus"]
        elif is_bear_p:
            match = next((p for p in top_bear_picks if p["symbol"] == sym), None)
            if match:
                pick_lbl = match["ruleStatus"]

        breadth_scatter.append({
            "symbol": sym,
            "changePct": chg,
            "strengthScore": r["strength_score"],
            "isTopPick": is_bull_p or is_bear_p,
            "pickLabel": pick_lbl,
            "board": "bullish" if chg > 0 else "bearish" if chg < 0 else "neutral",
        })

    # Sector flows
    sec_map: Dict[str, Dict[str, float]] = {}
    for r in raw_list:
        s = r["inst"]["sector"]
        if s not in sec_map:
            sec_map[s] = {"total": 0.0, "count": 0}
        sec_map[s]["total"] += r["change_pct"]
        sec_map[s]["count"] += 1

    sector_flows = sorted(
        [
            {"sector": k, "changePct": round(v["total"] / v["count"], 2), "count": v["count"]}
            for k, v in sec_map.items()
        ],
        key=lambda x: x["changePct"],
        reverse=True
    )

    now_ist = datetime.now(tz=IST)
    session_status = get_nse_session_status(now_ist)

    return {
        "brand": "OrderBlock",
        "marketStatus": "OPEN" if session_status == "open" else "CLOSED",
        "sessionTimeIST": f"{now_ist.strftime('%H:%M')} IST ({session_status.upper()})",
        "refreshSecondsLeft": 60,
        "totalFNO": len(raw_list),
        "advancesCount": advances,
        "declinesCount": declines,
        "breadthScatter": breadth_scatter,
        "sectorFlows": sector_flows,
        "bullishBoard": bullish_board,
        "bearishBoard": bearish_board,
        "topBullishPicks": top_bull_picks,
        "topBearishPicks": top_bear_picks,
    }
