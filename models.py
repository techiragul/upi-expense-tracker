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
        return connection
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        raise

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            amount DECIMAL(10, 2) NOT NULL,
            category VARCHAR(50) NOT NULL,
            description TEXT,
            transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        conn.commit()
        
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
        return cursor.lastrowid
    except mysql.connector.Error as err:
        print(f"Error adding expense: {err}")
        return None
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

def delete_expense(expense_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "DELETE FROM expenses WHERE id = %s"
        cursor.execute(query, (expense_id,))
        conn.commit()
        
        return cursor.rowcount > 0
    except mysql.connector.Error as err:
        print(f"Error deleting expense: {err}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

def update_expense(expense_id, amount=None, category=None, description=None):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if amount is not None:
            updates.append("amount = %s")
            params.append(amount)
        if category is not None:
            updates.append("category = %s")
            params.append(category)
        if description is not None:
            updates.append("description = %s")
            params.append(description)
            
        if not updates:
            return False
            
        query = f"UPDATE expenses SET {', '.join(updates)} WHERE id = %s"
        params.append(expense_id)
        
        cursor.execute(query, tuple(params))
        conn.commit()
        
        return cursor.rowcount > 0
    except mysql.connector.Error as err:
        print(f"Error updating expense: {err}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

def get_expenses_by_date_range(start_date, end_date):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
        SELECT id, amount, category, description, 
               DATE_FORMAT(transaction_date, '%Y-%m-%d %H:%i:%s') as transaction_date
        FROM expenses
        WHERE transaction_date BETWEEN %s AND %s
        ORDER BY transaction_date DESC
        """
        
        cursor.execute(query, (start_date, end_date))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        print(f"Error fetching expenses by date range: {err}")
        return []
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()