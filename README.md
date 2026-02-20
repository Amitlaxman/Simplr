# Simplr

Simplr is an AI-powered tool designed to simplify complex text. It consists of a Chrome Extension (Frontend) and a FastAPI service (Backend).

## Project Structure

- `frontend/`: Chrome Extension built with React, TypeScript, and Vite.
- `backend/`: Python API built with FastAPI, LangChain, and SQLAlchemy.

## Getting Started

### Backend

The backend runs locally using FastAPI.

1.  Navigate to the `backend/` directory.
2.  Create and activate a virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # On Windows
    # source venv/bin/activate  # On Linux/macOS
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Ensure you have **PostgreSQL** installed and running on your system.
5.  Create a `.env` file in the `backend/` directory based on the `.env` template and ensure the `DATABASE_URL` points to your local instance.
6.  Run the FastAPI backend:
    ```bash
    uvicorn app.main:app --reload
    ```

The backend will be available at [http://localhost:8000](http://localhost:8000).

### Frontend (Chrome Extension)

1.  Navigate to the `frontend/` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the extension:
    ```bash
    npm run build
    ```
4.  Load the extension in Chrome:
    - Open Chrome and go to `chrome://extensions/`.
    - Enable "Developer mode".
    - Click "Load unpacked" and select the `frontend/dist` directory.

## Tech Stack

- **Frontend**: React, TypeScript, Vite.
- **Backend**: FastAPI, LangChain, Pydantic.
- **Database**: PostgreSQL, ChromaDB.
- **Deployment**: Local execution (Python, Node.js)
