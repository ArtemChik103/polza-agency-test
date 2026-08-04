import os
import sys
import json
import zipfile
import glob
import logging
from pathlib import Path
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Force UTF-8 output encoding for console execution
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

# Load environment variables from .env file if present
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "company_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")


def get_connection():
    """Establish connection to PostgreSQL database."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )


def extract_items_from_sources(base_dir: Path):
    """Extract all records from data_pack.zip or extracted directory."""
    items = []
    zip_path = base_dir / "data_pack.zip"
    extracted_dir = base_dir / "extracted"

    if zip_path.exists():
        logger.info(f"Extracting records directly from zip archive: {zip_path}")
        with zipfile.ZipFile(zip_path, 'r') as z:
            json_files = sorted([f for f in z.namelist() if f.endswith('.json')])
            for fname in json_files:
                with z.open(fname) as f:
                    content = f.read().decode('utf-8')
                    data = json.loads(content)
                    items.extend(data.get('items', []))
    elif extracted_dir.exists():
        logger.info(f"Reading records from extracted directory: {extracted_dir}")
        json_files = sorted(glob.glob(str(extracted_dir / "*.json")))
        for fpath in json_files:
            with open(fpath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                items.extend(data.get('items', []))
    else:
        raise FileNotFoundError("Neither data_pack.zip nor extracted directory was found!")

    return items


def apply_schema(conn, schema_path: Path):
    """Execute schema.sql to set up tables and indexes."""
    logger.info(f"Applying database schema from {schema_path.name}...")
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    with conn.cursor() as cur:
        cur.execute(schema_sql)
    conn.commit()
    logger.info("Schema applied successfully.")


def load_data(conn, items):
    """Insert items into PostgreSQL with deduplication ON CONFLICT DO NOTHING."""
    logger.info(f"Processing and loading {len(items)} items into PostgreSQL...")

    insert_sql = """
        INSERT INTO companies (id, name, category, city, address, rating, reviews_count, site, phone)
        VALUES %s
        ON CONFLICT (id) DO NOTHING;
    """

    records = [
        (
            item.get("id"),
            item.get("name"),
            item.get("category"),
            item.get("city"),
            item.get("address"),
            item.get("rating"),
            item.get("reviews_count", 0),
            item.get("site"),
            item.get("phone")
        )
        for item in items
    ]

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM companies;")
        before_count = cur.fetchone()[0]

        execute_values(cur, insert_sql, records, page_size=200)
        conn.commit()

        cur.execute("SELECT COUNT(*) FROM companies;")
        after_count = cur.fetchone()[0]

    inserted = after_count - before_count
    duplicates = len(items) - inserted
    logger.info("Data loading complete.")
    logger.info(f"  - Total records processed from API: {len(items)}")
    logger.info(f"  - Unique records inserted:       {inserted}")
    logger.info(f"  - Deduplicated/Skipped records:  {duplicates}")
    logger.info(f"  - Current total rows in table:    {after_count}")


def run_verification_queries(conn, queries_path: Path):
    """Run SQL queries from queries.sql and output formatted results."""
    logger.info(f"Executing analytical queries from {queries_path.name}...")
    with open(queries_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Split statements by semicolon while ignoring comments
    statements = []
    current_stmt = []
    for line in sql_content.splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("--"):
            continue
        current_stmt.append(line)
        if trimmed.endswith(";"):
            statements.append("\n".join(current_stmt))
            current_stmt = []

    with conn.cursor() as cur:
        for idx, stmt in enumerate(statements, 1):
            logger.info(f"\n==================== Query {idx} Result ====================")
            cur.execute(stmt)
            colnames = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

            # Print headers
            header_str = " | ".join(f"{col:^25}" for col in colnames)
            print("-" * len(header_str))
            print(header_str)
            print("-" * len(header_str))

            for row in rows[:5]:
                row_str = " | ".join(f"{str(val):^25}" for val in row)
                print(row_str)

            if len(rows) > 5:
                print(f"... ({len(rows) - 5} additional rows omitted)")
            print("-" * len(header_str))


def main():
    base_dir = Path(__file__).parent.resolve()
    schema_path = base_dir / "schema.sql"
    queries_path = base_dir / "queries.sql"

    logger.info(f"Connecting to PostgreSQL database '{DB_NAME}' at {DB_HOST}:{DB_PORT}...")
    try:
        conn = get_connection()
        logger.info("Successfully connected to PostgreSQL database.")
    except Exception as e:
        logger.error(f"Could not connect to PostgreSQL database: {e}")
        sys.exit(1)

    try:
        if schema_path.exists():
            apply_schema(conn, schema_path)

        items = extract_items_from_sources(base_dir)
        load_data(conn, items)

        if queries_path.exists():
            run_verification_queries(conn, queries_path)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
