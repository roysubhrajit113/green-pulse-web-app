from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
from dotenv import load_dotenv
import google.generativeai as genai


load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file")

genai.configure(api_key=api_key)

app = Flask(__name__)

CORS(app)

model = genai.GenerativeModel("gemini-1.5-flash")

@app.route("/")
def home():
    return jsonify({"status": "Chatbot service is running", "message": "Welcome to Green Pulse AI"})

@app.route("/health")
def health():
    return jsonify({"status": "healthy", "service": "chatbot"})

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.json
        user_message = data.get("message", "")
        if not user_message:
            return jsonify({"response": "Please send a valid message."}), 400


        instruction = """You are a helpful AI assistant for Green Pulse, a carbon tracking and energy token platform. 
        Reply concisely, no more than 2-3 sentences. Focus on helping users with:
        - Carbon tracking and emissions
        - ENTO energy tokens
        - Profile management
        - Leaderboards and rankings
        - Platform navigation"""
        
        full_prompt = f"{instruction}\nUser: {user_message}"

        response = model.generate_content(full_prompt)
        return jsonify({"response": response.text})

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({"response": f"Error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5001)
