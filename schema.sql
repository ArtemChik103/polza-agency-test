-- Schema definition for companies dataset
-- PostgreSQL 14+ compatible

CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    rating NUMERIC(3, 2),
    reviews_count INTEGER NOT NULL DEFAULT 0,
    site TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization

-- 1. Accelerates category grouping and filtering (Queries 1 & 3)
CREATE INDEX IF NOT EXISTS idx_companies_category 
    ON companies (category);

-- 2. Accelerates city aggregations filtered by review count and rating (Query 2)
CREATE INDEX IF NOT EXISTS idx_companies_city_reviews_rating 
    ON companies (city, reviews_count, rating);

-- 3. Partial index accelerating website existence calculations (Query 3)
CREATE INDEX IF NOT EXISTS idx_companies_site 
    ON companies (site) 
    WHERE site IS NOT NULL;
