from flask import Flask, request, jsonify, send_from_directory
from groq import Groq
from dotenv import load_dotenv
import os
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime
from flask_cors import CORS

# Import our modules
from models import init_db, add_expense, get_expenses
from ocr_utils import extract_text_from_image, parse_upi_transaction

app = Flask(__name__, static_folder='static')
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/expenses', methods=['GET', 'POST'])
def handle_expenses():
    if request.method == 'POST':
        data = request.json
        try:
            add_expense(
                amount=float(data['amount']),
                category=data['category'],
                description=data.get('description', '')
            )
            return jsonify({'status': 'success'}), 201
        except Exception as e:
            return jsonify({'error': str(e)}), 400
    else:
        expenses = get_expenses()
        return jsonify(expenses)

@app.route('/api/upload-receipt', methods=['POST'])
def upload_receipt():
    try:
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'error': 'No file part'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'status': 'error', 'error': 'No selected file'}), 400
        
        if not file or not allowed_file(file.filename):
            return jsonify({'status': 'error', 'error': 'File type not allowed'}), 400

        # Generate a unique filename
        filename = f"{uuid.uuid4()}_{secure_filename(file.filename)}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        try:
            # Save the file
            file.save(filepath)
            print(f"File saved to: {filepath}")
            
            # Extract text from image
            print("Extracting text from image...")
            text = extract_text_from_image(filepath)
            print(f"Extracted text: {text[:200]}...")
            
            # Parse transaction details
            print("Parsing transaction...")
            transaction = parse_upi_transaction(text)
            print(f"Parsed transaction: {transaction}")
            
            # Ensure we have the expected structure
            if not transaction or 'status' not in transaction:
                return jsonify({
                    'status': 'error',
                    'error': 'Failed to parse receipt data'
                }), 400
                
            if transaction.get('status') == 'error':
                return jsonify({
                    'status': 'error',
                    'error': transaction.get('error', 'Failed to process receipt')
                }), 400
            
            # Return the extracted data in the expected format
            return jsonify({
                'status': 'success',
                'extracted_data': {
                    'amount': transaction.get('amount'),
                    'category': transaction.get('category', 'Other'),
                    'merchant': transaction.get('merchant'),
                    'date': transaction.get('date')
                }
            })
            
        except Exception as e:
            print(f"Error processing file: {str(e)}")
            return jsonify({
                'status': 'error',
                'error': f'Error processing file: {str(e)}'
            }), 500
        finally:
            # Clean up the uploaded file
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
                    print(f"Cleaned up file: {filepath}")
            except Exception as e:
                print(f"Error cleaning up file: {str(e)}")
                
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'An unexpected error occurred'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
