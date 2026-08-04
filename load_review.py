import os
import sys
import json
import zipfile
import io
import re
import logging
from pathlib import Path
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Force UTF-8 stdout
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "company_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")


def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )


def extract_review_csv(base_dir: Path):
    """Extract review.csv from data_pack.zip or local folder."""
    zip_path = base_dir / "data_pack.zip"
    csv_path = base_dir / "review.csv"

    if zip_path.exists():
        logger.info(f"Extracting review.csv directly from {zip_path.name}...")
        with zipfile.ZipFile(zip_path, 'r') as z:
            if 'review.csv' in z.namelist():
                with z.open('review.csv') as f:
                    content = f.read().decode('utf-8', errors='replace')
                    return pd.read_csv(io.StringIO(content))
    if csv_path.exists():
        logger.info(f"Reading local {csv_path.name}...")
        return pd.read_csv(csv_path)

    raise FileNotFoundError("review.csv not found in data_pack.zip or local folder!")


def sanitize_and_load(conn, df: pd.DataFrame):
    logger.info(f"Raw rows in review.csv: {len(df)}")

    valid_records = []
    skipped_count = 0
    sanitized_count = 0

    for idx, row in df.iterrows():
        cid = row.get("id")

        # 1. Skip NULL IDs / completely empty rows
        if pd.isna(cid) or not str(cid).strip():
            logger.warning(f"Row {idx + 2}: Skipping row with NULL/empty ID.")
            skipped_count += 1
            continue

        cid = str(cid).strip()
        name = str(row.get("name", "")).strip() if pd.notnull(row.get("name")) else "Unknown"
        category = str(row.get("category", "")).strip() if pd.notnull(row.get("category")) else "Uncategorized"
        city = str(row.get("city", "")).strip() if pd.notnull(row.get("city")) else "Unknown"
        address = str(row.get("address", "")).strip() if pd.notnull(row.get("address")) else "Unknown"

        # 2. Sanitize rating
        raw_rating = row.get("rating")
        rating = None
        if pd.notnull(raw_rating):
            try:
                clean_rating = float(str(raw_rating).replace(',', '.'))
                if 1.0 <= clean_rating <= 5.0:
                    rating = round(clean_rating, 2)
                else:
                    logger.warning(f"Row {idx + 2} ({cid}): Invalid rating range '{raw_rating}'. Setting rating to NULL.")
                    sanitized_count += 1
            except ValueError:
                logger.warning(f"Row {idx + 2} ({cid}): Non-numeric rating '{raw_rating}'. Setting rating to NULL.")
                sanitized_count += 1

        # 3. Sanitize reviews_count
        raw_reviews = row.get("reviews_count")
        reviews_count = 0
        if pd.notnull(raw_reviews):
            try:
                clean_rev = float(str(raw_reviews).replace(',', '.'))
                if clean_rev >= 0:
                    reviews_count = int(clean_rev)
                    if clean_rev != reviews_count:
                        logger.warning(f"Row {idx + 2} ({cid}): Fractional reviews_count '{raw_reviews}' converted to int {reviews_count}.")
                        sanitized_count += 1
                else:
                    logger.warning(f"Row {idx + 2} ({cid}): Negative reviews_count '{raw_reviews}'. Setting to 0.")
                    reviews_count = 0
                    sanitized_count += 1
            except ValueError:
                logger.warning(f"Row {idx + 2} ({cid}): Corrupted reviews_count '{raw_reviews}'. Setting to 0.")
                reviews_count = 0
                sanitized_count += 1

        # 4. Sanitize site
        raw_site = row.get("site")
        site = None
        if pd.notnull(raw_site):
            site_str = str(raw_site).strip()
            if site_str.startswith("http://") or site_str.startswith("https://"):
                site = site_str
            elif site_str.startswith("htp://"):
                site = site_str.replace("htp://", "http://")
                logger.warning(f"Row {idx + 2} ({cid}): Fixed typo in site URL scheme 'htp://' -> 'http://'.")
                sanitized_count += 1
            else:
                logger.warning(f"Row {idx + 2} ({cid}): Invalid site URL '{site_str}'. Setting to NULL.")
                sanitized_count += 1

        # 5. Sanitize phone
        raw_phone = row.get("phone")
        phone = None
        if pd.notnull(raw_phone):
            p_str = str(raw_phone).strip()
            if re.match(r'^\+7\s\(\d{3}\)\s\d{3}-\d{2}-\d{2}$', p_str):
                phone = p_str
            else:
                logger.warning(f"Row {idx + 2} ({cid}): Non-standard phone '{p_str}'. Storing raw or setting NULL.")
                phone = p_str if len(p_str) > 5 else None

        valid_records.append((cid, name, category, city, address, rating, reviews_count, site, phone))

    # Insert into PostgreSQL
    insert_sql = """
        INSERT INTO companies (id, name, category, city, address, rating, reviews_count, site, phone)
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            city = EXCLUDED.city,
            address = EXCLUDED.address,
            rating = EXCLUDED.rating,
            reviews_count = EXCLUDED.reviews_count,
            site = EXCLUDED.site,
            phone = EXCLUDED.phone;
    """

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM companies;")
        before_count = cur.fetchone()[0]

        execute_values(cur, insert_sql, valid_records, page_size=200)
        conn.commit()

        cur.execute("SELECT COUNT(*) FROM companies;")
        after_count = cur.fetchone()[0]

    logger.info("=== ETL Report for review.csv ===")
    logger.info(f"Total raw rows in review.csv:    {len(df)}")
    logger.info(f"Skipped empty rows:             {skipped_count}")
    logger.info(f"Sanitized/corrected rows:       {sanitized_count}")
    logger.info(f"Valid records processed:        {len(valid_records)}")
    logger.info(f"Database rows before loading:   {before_count}")
    logger.info(f"Database rows after loading:    {after_count}")
    logger.info(f"Net new companies added:        {after_count - before_count}")


def main():
    base_dir = Path(__file__).parent.resolve()
    logger.info("Connecting to PostgreSQL...")
    conn = get_connection()
    try:
        df = extract_review_csv(base_dir)
        sanitize_and_load(conn, df)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
