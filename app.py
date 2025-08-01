from flask import Flask, request, jsonify, send_from_directory
from groq import Groq
from dotenv import load_dotenv
import os
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime
from flask_cors import CORS
from models import init_db, add_expense, get_expenses, delete_expense as db_delete_expense, update_expense as db_update_expense
import cv2
import pytesseract
import numpy as np
import re
import json

app = Flask(__name__, static_folder='static')
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Initialize database
init_db()

# Initialize Groq client
load_dotenv()
client = Groq(api_key=os.getenv('GROQ_API_KEY'))

conversation_history = [
    {"role": "system", "content": "You are a helpful expense tracking assistant."}
]

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image_for_ocr(image_path):
    """Preprocess image for better OCR results"""
    try:
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            return None
            
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply threshold to get better contrast
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        return thresh
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        return None

def extract_text_from_image(image_path):
    """Extract text from image using Tesseract OCR"""
    try:
        # Preprocess the image
        processed_image = preprocess_image_for_ocr(image_path)
        if processed_image is None:
            # Fallback to original image
            processed_image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        
        # Configure Tesseract
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,-₹$@/: '
        
        # Extract text
        text = pytesseract.image_to_string(processed_image, config=custom_config)
        return text.strip()
    except Exception as e:
        print(f"Error extracting text: {e}")
        return ""

def parse_receipt_with_groq(extracted_text):
    """Use Groq to intelligently parse the extracted text"""
    try:
        prompt = f"""
        You are an expert at parsing receipt data. Analyze the following text extracted from a receipt and return ONLY a valid JSON object with these exact fields:
        
        Text from receipt:
        {extracted_text}
        
        Please extract:
        - amount: The total amount as a number (just the number, no currency symbols)
        - merchant: The merchant/store name
        - category: One of these categories: "Food & Dining", "Transport", "Shopping", "Bills & Utilities", "Entertainment", "Other"
        - date: Transaction date if found (YYYY-MM-DD format)
        
        Return ONLY valid JSON, no explanation:
        """
        
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a receipt parsing expert. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model="mixtral-8x7b-32768",
            temperature=0.1,
            max_tokens=150
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Try to extract JSON from the response
        json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
        if json_match:
            parsed_data = json.loads(json_match.group(0))
            return parsed_data
        else:
            raise ValueError("No valid JSON found in AI response")
            
    except Exception as e:
        print(f"Error parsing with Groq: {e}")
        return None

def parse_receipt_text(text):
    """Fallback parsing method using regex patterns"""
    try:
        # Initialize result
        result = {
            'amount': None,
            'merchant': 'Unknown',
            'category': 'Other',
            'date': None
        }
        
        # Extract amount (₹123.45, Rs 123.45, 123.45, etc.)
        amount_patterns = [
            r'₹\s*(\d+(?:\.\d{2})?)',
            r'Rs\.?\s*(\d+(?:\.\d{2})?)',
            r'Total[:\s]*₹?\s*(\d+(?:\.\d{2})?)',
            r'Amount[:\s]*₹?\s*(\d+(?:\.\d{2})?)',
            r'(\d+\.\d{2})'
        ]
        
        for pattern in amount_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    result['amount'] = float(match.group(1))
                    break
                except:
                    continue
        
        # Extract merchant (usually in first few lines)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            # Take the first substantial line as merchant
            for line in lines[:3]:
                if len(line) > 3 and not re.match(r'^\d+[\.\-\s]*$', line):
                    result['merchant'] = line[:50]  # Limit length
                    break
        
        # Categorize based on keywords
        text_lower = text.lower()
        if any(word in text_lower for word in ['restaurant', 'cafe', 'food', 'dining', 'hotel', 'zomato', 'swiggy']):
            result['category'] = 'Food & Dining'
        elif any(word in text_lower for word in ['uber', 'ola', 'taxi', 'metro', 'bus', 'transport']):
            result['category'] = 'Transport'
        elif any(word in text_lower for word in ['mall', 'store', 'shop', 'amazon', 'flipkart']):
            result['category'] = 'Shopping'
        elif any(word in text_lower for word in ['electric', 'water', 'gas', 'bill', 'utility']):
            result['category'] = 'Bills & Utilities'
        elif any(word in text_lower for word in ['movie', 'cinema', 'game', 'entertainment']):
            result['category'] = 'Entertainment'
        
        return result
        
    except Exception as e:
        print(f"Error in fallback parsing: {e}")
        return {
            'amount': None,
            'merchant': 'Unknown',
            'category': 'Other',
            'date': None
        }

@app.route('/api/upload-receipt', methods=['POST'])
def upload_receipt():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        try:
            # Save the file temporarily
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)
            
            print(f"Processing file: {filepath}")
            
            # Extract text using OCR
            extracted_text = extract_text_from_image(filepath)
            print(f"Extracted text: {extracted_text}")
            
            if not extracted_text:
                return jsonify({
                    'success': False,
                    'error': 'Could not extract text from image',
                    'message': 'Please ensure the image is clear and contains readable text'
                }), 400
            
            # Try to parse with Groq AI first
            parsed_data = parse_receipt_with_groq(extracted_text)
            
            # If Groq parsing fails, use fallback method
            if not parsed_data:
                print("Groq parsing failed, using fallback method")
                parsed_data = parse_receipt_text(extracted_text)
            
            # Clean up the temporary file
            try:
                os.remove(filepath)
            except:
                pass  # Don't fail if cleanup fails
            
            # Ensure we have valid data structure
            final_data = {
                'amount': parsed_data.get('amount'),
                'merchant': parsed_data.get('merchant', 'Unknown'),
                'category': parsed_data.get('category', 'Other'),
                'date': parsed_data.get('date'),
                'raw_text': extracted_text[:500]  # Limit raw text length
            }
            
            print(f"Final parsed data: {final_data}")
            
            return jsonify({
                'success': True,
                'extracted_data': final_data
            })
                
        except Exception as e:
            print(f"Error processing receipt: {str(e)}")
            # Clean up file if it exists
            try:
                if 'filepath' in locals():
                    os.remove(filepath)
            except:
                pass
                
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Failed to process receipt. Please try again.'
            }), 500
    else:
        return jsonify({
            'success': False,
            'error': 'File type not allowed',
            'allowed_types': list(ALLOWED_EXTENSIONS)
        }), 400

# Your existing routes (unchanged)
@app.route('/api/expenses', methods=['GET'])
def get_expenses_route():
    expenses = get_expenses()
    return jsonify(expenses)

@app.route('/api/expenses', methods=['POST'])
def create_expense():
    data = request.get_json()
    expense = add_expense(
        amount=data['amount'],
        category=data['category'],
        description=data.get('description', '')
    )
    return jsonify(expense), 201

@app.route('/api/expenses/<int:id>', methods=['PUT'])
def update_expense(id):
    data = request.get_json()
    expense = db_update_expense(
        id=id,
        amount=data.get('amount'),
        category=data.get('category'),
        description=data.get('description')
    )
    return jsonify(expense)

@app.route('/api/expenses/<int:id>', methods=['DELETE'])
def delete_expense(id):
    db_delete_expense(id)
    return '', 204

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message', '')
    
    # Add user message to conversation history
    conversation_history.append({"role": "user", "content": user_message})
    
    try:
        # Get response from Groq
        response = client.chat.completions.create(
            messages=conversation_history,
            model="mixtral-8x7b-32768",
        )
        
        # Get the assistant's response
        assistant_message = response.choices[0].message.content
        
        # Add assistant response to conversation history
        conversation_history.append({"role": "assistant", "content": assistant_message})
        
        return jsonify({
            'response': assistant_message,
            'conversation_id': str(uuid.uuid4())
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
