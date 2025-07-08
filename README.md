# Local Chatbot

A simple web-based chatbot that runs locally using Hugging Face's Transformers library.

## Features

- Completely local - no API keys or internet required after setup
- Uses Microsoft's DialoGPT-small model for conversation
- Clean, responsive UI with typing indicators
- Message history and context awareness

## Setup

1. Install the required packages:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```
   The first run will download the model (about 500MB).

3. Open your browser and go to `http://localhost:5001`

## Usage

- Type your message in the input field and press Enter or click Send
- The chatbot will respond using the local AI model
- The interface shows typing indicators during response generation
- The chat maintains context from previous messages

## Note

- The first run will take some time to download the model
- Responses may take a few seconds to generate
- The model is small enough to run on most computers but may be slower on lower-end hardware
# upi-expense-tracker
