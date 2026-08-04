import os
import time
from playwright.sync_api import sync_playwright

os.makedirs('screenshots', exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 850})
    
    # 1. Initial Page
    print("Navigating to http://localhost:3000/companies...")
    page.goto("http://localhost:3000/companies", wait_until="networkidle")
    page.screenshot(path="screenshots/01_initial_companies_list.png", full_page=False)
    print("Saved screenshots/01_initial_companies_list.png")
    
    # 2. Search by Name ('Прайм')
    page.fill('input[placeholder*="Поиск"]', 'Прайм')
    page.click('button:has-text("Найти")')
    page.wait_for_timeout(1000)
    page.screenshot(path="screenshots/02_search_by_name.png", full_page=False)
    print("Saved screenshots/02_search_by_name.png")
    
    # 3. Filter by City ('Москва')
    page.select_option('select', label='Москва')
    page.wait_for_timeout(1000)
    page.screenshot(path="screenshots/03_filter_by_city.png", full_page=False)
    print("Saved screenshots/03_filter_by_city.png")
    
    # 4. Empty Search State ('NonExistentCompany123')
    page.fill('input[placeholder*="Поиск"]', 'NonExistentCompany123')
    page.click('button:has-text("Найти")')
    page.wait_for_timeout(1000)
    page.screenshot(path="screenshots/04_empty_search_state.png", full_page=False)
    print("Saved screenshots/04_empty_search_state.png")
    
    # 5. Reset Filters
    page.click('button:has-text("Сбросить")')
    page.wait_for_timeout(1000)
    page.screenshot(path="screenshots/05_reset_filters.png", full_page=False)
    print("Saved screenshots/05_reset_filters.png")
    
    browser.close()

print("All 5 screenshots captured successfully!")
