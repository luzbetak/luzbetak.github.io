#!/usr/bin/env python

import sqlite3

# Connect to SQLite3 database (it will create the database if it doesn't exist)
conn = sqlite3.connect('sales_data.db')
cursor = conn.cursor()

# Create the sales table
cursor.execute('''
CREATE TABLE IF NOT EXISTS sales (
    transaction_id INT,
    product_id INT,
    region_id INT,
    sale_date DATE,
    quantity INT,
    price DECIMAL(10, 2)
);
''')

# Insert the sample data
cursor.executemany('''
INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?);
''', [
    (1, 101, 1, '2023-01-05', 100, 10.50),
    (2, 102, 1, '2023-02-10', 150, 15.75),
    (3, 103, 1, '2023-03-15', 200, 20.00),
    (4, 101, 2, '2023-01-05', 120, 11.25),
    (5, 102, 2, '2023-02-10', 180, 18.50),
    (6, 103, 2, '2023-03-15', 220, 22.75),
    (7, 101, 3, '2023-01-05', 80, 9.75),
    (8, 102, 3, '2023-02-10', 100, 12.25),
    (9, 103, 3, '2023-03-15', 150, 17.00)
])

# Commit the transaction
conn.commit()

# SQL query to find the top-selling product in each region for the year 2023
query = '''
WITH sales_2023 AS (
    SELECT 
        product_id,
        region_id,
        SUM(quantity * price) AS total_sales_revenue
    FROM 
        sales
    WHERE 
        strftime('%Y', sale_date) = '2023'
    GROUP BY 
        product_id, region_id
),
ranked_sales AS (
    SELECT 
        product_id,
        region_id,
        total_sales_revenue,
        RANK() OVER (PARTITION BY region_id ORDER BY total_sales_revenue DESC) AS rank
    FROM 
        sales_2023
)
SELECT 
    region_id,
    product_id,
    total_sales_revenue
FROM 
    ranked_sales
WHERE 
    rank = 1;
'''

# Execute the query
cursor.execute(query)
results = cursor.fetchall()

# Display the results
print("Top-selling products in each region for 2023:")
for row in results:
    print(f"Region ID: {row[0]}, Product ID: {row[1]}, Total Sales Revenue: {row[2]}")

# Close the connection
conn.close()

