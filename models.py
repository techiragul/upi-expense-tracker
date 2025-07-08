import mysql.connector
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '3306')),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', 'root'),
            database=os.getenv('DB_NAME', 'expense_tracker')
        )
        print("Successfully connected to the database!")

        return connection
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        raise

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if table exists
        cursor.execute("""
        SELECT COUNT(*)
        FROM information_schema.tables 
        WHERE table_schema = %s
        AND table_name = 'expenses'
        """, (os.getenv('DB_NAME', 'expense_tracker'),))
        
        table_exists = cursor.fetchone()['COUNT(*)'] > 0
        
        
            
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        raise
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

def add_expense(amount, category, description=None):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        INSERT INTO expenses (amount, category, description)
        VALUES (%s, %s, %s)
        """
        
        cursor.execute(query, (amount, category, description))
        conn.commit()
        return True
    except mysql.connector.Error as err:
        print(f"Error adding expense: {err}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

def get_expenses():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
        SELECT id, amount, category, description, 
               DATE_FORMAT(transaction_date, '%Y-%m-%d %H:%i:%s') as transaction_date
        FROM expenses
        ORDER BY transaction_date DESC
        """)
        
        return cursor.fetchall()
    except mysql.connector.Error as err:
        print(f"Error fetching expenses: {err}")
        return []
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
