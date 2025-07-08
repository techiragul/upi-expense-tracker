import cv2
import pytesseract
import re
import os
import numpy as np
from groq import Groq
from dotenv import load_dotenv
from typing import Dict, Optional, Union

# Load environment variables
load_dotenv()

# Initialize GROQ client
try:
    groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))
except Exception as e:
    print("Warning: Could not initialize GROQ client. Make sure GROQ_API_KEY is set in .env file")
    groq_client = None

def preprocess_image(image_path: str) -> np.ndarray:
    """Preprocess the image for better OCR results"""
    try:
        # Read image using OpenCV
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Could not read the image")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply thresholding to preprocess the image
        gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        
        # Apply dilation to connect text components
        kernel = np.ones((1, 1), np.uint8)
        gray = cv2.dilate(gray, kernel, iterations=1)
        
        return gray
        
    except Exception as e:
        print(f"Error in image preprocessing: {str(e)}")
        raise

def extract_text_from_image(image_path: str) -> str:
    """Extract text from image using Tesseract OCR with optimized settings for receipts"""
    try:
        print(f"\n[DEBUG] Starting OCR processing for: {image_path}")
        
        # Check if file exists
        if not os.path.exists(image_path):
            print(f"[ERROR] File not found: {image_path}")
            return ""

        # Preprocess the image
        print("[DEBUG] Preprocessing image...")
        processed_img = preprocess_image(image_path)
        
        if processed_img is None:
            print("[ERROR] Failed to preprocess image")
            return ""

        # Configure Tesseract for better receipt reading
        config = (
            '--oem 3 '  # LSTM OCR Engine
            '--psm 6 '   # Assume a single uniform block of text
        )
        
        print("[DEBUG] Running Tesseract OCR...")
        try:
            # Set Tesseract path (update this to your Tesseract installation path)
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
            
            # Extract text with the configured settings
            text = pytesseract.image_to_string(processed_img, config=config.strip())
            print("\n=== Extracted Text ===")
            print(text)
            print("=" * 20 + "\n")
            
            if not text.strip():
                print("[WARNING] No text was extracted from the image")
            
            return text.strip()
            
        except pytesseract.TesseractError as te:
            print(f"[ERROR] Tesseract Error: {str(te)}")
            print("Please ensure Tesseract is installed and in your system PATH")
            print("For Windows, download from: https://github.com/UB-Mannheim/tesseract/wiki")
            return ""
            
    except Exception as e:
        import traceback
        print(f"\n[ERROR] Unexpected error in extract_text_from_image:")
        print(f"Type: {type(e).__name__}")
        print(f"Message: {str(e)}")
        print("Stack trace:")
        print(traceback.format_exc())
        return ""

def analyze_with_groq(text: str) -> Optional[str]:
    """Analyze the extracted text using GROQ AI"""
    if not groq_client:
        print("GROQ client not initialized. Please check your API key.")
        return None
        
    try:
        # Prepare the prompt for GROQ
        prompt = f"""
Analyze this UPI transaction receipt text and provide a detailed response in the following structured format:

**UPI Transaction Receipt Analysis**

1. **Transaction Amount**: [Extract the amount with ₹ symbol]
2. **Merchant Name/Recipient**: [Extract recipient name or merchant]
3. **Transaction Date**: [Extract date and time if available]
4. **Category**: [Determine category: Personal Transfer, Shopping, Food, Bills, Other etc.]
5. **Other Relevant Details**:
   - UPI Transaction ID: [Extract if available]
   - Sender's Name: [Extract if available]
   - Sender's Bank: [Extract if available]
   - Sender's UPI ID/UTR: [Extract if available]
   - Google Pay or PhonePe Transaction ID: [Extract if available]
   - Status: [Extract if available]
   - Notes: [Extract if available]

6. **Additional Notes**:
   - [Any other important information from the receipt]
   - [Payment app used if mentioned]

Here's the extracted text to analyze:
{text}

Please provide the information in a clear, well-formatted markdown structure as shown above.
If any information is not available in the text, simply omit that field.
"""
        
        # Call GROQ API
        completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.3,
            max_tokens=1024,
            top_p=1,
            stream=False,
        )
        
        # Get the response
        analysis = completion.choices[0].message.content
        print("\n=== GROQ Analysis ===")
        print(analysis)
        print("=" * 20 + "\n")
        
        return analysis
        
    except Exception as e:
        print(f"Error analyzing with GROQ: {str(e)}")
        return None

def extract_amount_from_text(text: str) -> Optional[float]:
    """Extract amount from receipt text with various patterns"""
    print("\n[DEBUG] Extracting amount from text...")
    print(f"First 200 chars of text: {text[:200]}...")
    
    try:
        # Define patterns to try in order of preference
        patterns = [
            # ₹20,000 or ₹ 20,000
            (r'₹\s*([\d,]+(?:\.\d{1,2})?)', "Rupee symbol with comma"),
            # INR 20,000 or INR20,000
            (r'INR\s*([\d,]+(?:\.\d{1,2})?)', "INR with comma"),
            # Amount: ₹20,000 or Amount: 20000
            (r'Amount\s*[:\-]?\s*₹?\s*([\d,]+)', "Amount label"),
            # Any number with comma as thousand separator
            (r'(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?)', "Comma separated number"),
            # Any 4-6 digit number that looks like an amount
            (r'\b(\d{4,6})\b', "4-6 digit number"),
        ]

        for pattern, pattern_name in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    amount_str = match.group(1).replace(',', '')
                    amount = float(amount_str)
                    print(f"Found amount with pattern '{pattern_name}': {amount}")
                    if 1 <= amount <= 500000:  # Reasonable amount range
                        print(f"Using amount: {amount}")
                        return amount
                    else:
                        print(f"Amount {amount} outside valid range (1-500000)")
                except (ValueError, AttributeError) as e:
                    print(f"Error processing match '{match.group(0)}': {str(e)}")
                    continue

        print("No valid amount found in text")
        return None

    except Exception as e:
        print(f"Unexpected error in extract_amount_from_text: {str(e)}")
        return None

# def extract_amount_from_text(text: str) -> Optional[float]:
#     #import re
#     try:
#         patterns = [
#             r'₹\s?([\d,]+(?:\.\d{1,2})?)',
#             r'INR\s?([\d,]+(?:\.\d{1,2})?)',
#             r'Amount\s*[:\-]?\s?₹?\s?([\d,]+)'
#         ]

#         for pattern in patterns:
#             match = re.search(pattern, text)
#             if match:
#                 amount_str = match.group(1).replace(',', '')
#                 amount = float(amount_str)
#                 if 1 <= amount <= 500000:
#                     return amount

#         return None

#     except Exception as e:
#         print("Error:", e)
#         return None


def parse_upi_transaction(text: str) -> Dict[str, Union[str, float, None]]:
    """Parse UPI transaction details from extracted text"""
    try:
        print("\n[DEBUG] Parsing transaction details...")
        
        # Initialize default values
        transaction = {
            'amount': None,
            'merchant': 'Unknown',
            'category': 'Other',
            'date': None,
            'status': 'success'
        }
        
        if not text or not text.strip():
            print("[WARNING] Empty text provided for parsing")
            transaction['status'] = 'error'
            transaction['error'] = 'No text content to analyze'
            return transaction
        
        # Extract amount
        amount = extract_amount_from_text(text)
        if amount is not None:
            transaction['amount'] = amount
            print(f"[DEBUG] Extracted amount: {amount}")
        
        # Extract merchant and category
        merchant_info = extract_merchant_info(text)
        transaction.update(merchant_info)
        
        # Extract date (if available)
        date_match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', text)
        if date_match:
            transaction['date'] = date_match.group(1)
            print(f"[DEBUG] Extracted date: {transaction['date']}")
        
        # Additional analysis with GROQ if needed
        if groq_client:
            analysis = analyze_with_groq(text)
            if analysis:
                transaction['analysis'] = analysis
        
        print(f"[DEBUG] Final transaction data: {transaction}")
        return transaction  # <-- This line was missing
        
    except Exception as e:
        import traceback
        error_msg = f"Error parsing transaction: {str(e)}"
        print(f"[ERROR] {error_msg}")
        print(traceback.format_exc())
        return {
            'amount': None,
            'merchant': 'Unknown',
            'category': 'Other',
            'status': 'error',
            'error': error_msg
        }

def extract_merchant_info(text: str) -> Dict[str, str]:
    """Extract merchant and category information from receipt text"""
    merchant = None
    category = 'Other'
    
    # Common merchant patterns
    merchant_patterns = [
        r'(?:paid to|sent to|for|merchant|recipient|shop|requested by)[\s:]+([a-z][a-z\s&\.-]+?)(?=\s*\d|\s+on\s+behalf|\s+on\s+\d|\n|$|\s+\*|\s+@)',
        r'received\s+(?:from|by)[\s:]+([a-z][a-z\s&\.-]+?)(?=\s*\d|\s+on\s+behalf|\s+on\s+\d|\n|$|\s+\*|\s+@)',
        r'to\s+([a-z][a-z\s&\.-]+?)(?=\s*\d|\s+on\s+behalf|\s+on\s+\d|\n|$|\s+\*|\s+@)',
    ]
    
    # Clean the text for merchant extraction
    merchant_text = '\n'.join([line for line in text.split('\n') 
                             if not any(word in line.lower() for word in 
                                      ['upi', 'ref', 'txn', 'id', 'bank', 'transaction']) 
                             and not re.search(r'\d{2}:\d{2}', line)])
    
    # Try to find merchant using patterns
    for pattern in merchant_patterns:
        match = re.search(pattern, merchant_text, re.IGNORECASE)
        if match and match.group(1):
            merchant = match.group(1).strip()
            # Clean up the merchant name
            merchant = re.sub(r'[^\w\s&\.-]', ' ', merchant).strip()
            merchant = ' '.join(word.capitalize() for word in merchant.split())
            if merchant and len(merchant) > 1:
                break
    
    # If no merchant found, look for common merchant names
    if not merchant:
        common_merchants = {
            'spotify': 'Spotify',
            'billdesk': 'BillDesk',
            'zomato': 'Zomato',
            'swiggy': 'Swiggy',
            'amazon': 'Amazon',
            'flipkart': 'Flipkart',
            'bigbasket': 'BigBasket',
            'uber': 'Uber',
            'ola': 'Ola',
            'irctc': 'IRCTC',
            'bookmyshow': 'BookMyShow'
        }
        
        for key, value in common_merchants.items():
            if key in text.lower():
                merchant = value
                break
    
    # Map merchant to category
    if merchant:
        merchant_lower = merchant.lower()
        if any(x in merchant_lower for x in ['spotify', 'netflix', 'prime', 'hotstar']):
            category = 'Entertainment'
        elif any(x in merchant_lower for x in ['zomato', 'swiggy', 'food', 'restaurant', 'cafe', 'dining']):
            category = 'Food & Dining'
        elif any(x in merchant_lower for x in ['amazon', 'flipkart', 'myntra', 'ajio']):
            category = 'Shopping'
        elif any(x in merchant_lower for x in ['uber', 'ola', 'rapido']):
            category = 'Transport'
        elif any(x in merchant_lower for x in ['billdesk', 'phonepe', 'paytm', 'google pay']):
            category = 'Bills & Utilities'
    
    return {
        'merchant': merchant or 'Unknown',
        'category': category
    }