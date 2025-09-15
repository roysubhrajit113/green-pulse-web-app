# Green Pulse Chatbot

## Overview

The chatbot component of Green Pulse provides an AI-powered assistant for users to interact with the platform using natural language. It's built with Python, Flask, and integrates with Google's Generative AI (Gemini).

## Tech Stack

- **Language**: Python 3.10+
- **Framework**: Flask
- **AI Integration**: Google Generative AI (Gemini)
- **API**: RESTful endpoints
- **CORS**: Flask-CORS for cross-origin requests

## Dependencies

- **flask**: Web framework
- **flask-cors**: Cross-Origin Resource Sharing
- **python-dotenv**: Environment variable management
- **google-generativeai**: Google's Generative AI client library

## Installation

1. Navigate to the chatbot directory:
   ```bash
   cd chatbot
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with the following variables:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   ```

## Usage

### Running the Chatbot Service

```bash
python main.py
```

This will start the Flask server on http://localhost:5001.

## API Endpoints

- `GET /`: Health check endpoint
- `GET /health`: Service health status
- `POST /chat`: Send a message to the chatbot

## Configuration

### Environment Variables

- `GEMINI_API_KEY`: API key for Google's Gemini AI model

## Docker Deployment

The chatbot can be deployed as part of the complete Green Pulse application using Docker:

```bash
# From the project root directory
docker-compose up -d
```

This will build and run the chatbot service as part of the containerized application.

## Integration with Frontend

The chatbot service is designed to be integrated with the frontend application. The frontend makes API calls to the chatbot service to process user messages and display responses.