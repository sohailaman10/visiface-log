# Backend Setup Guide

This application requires a Flask backend with face recognition capabilities to function properly.

## Backend Requirements

The frontend expects the following API endpoints:

### 1. User Registration
**POST** `/register_user`
```json
{
  "name": "string",
  "roll_number": "string",
  "class": "string",
  "section": "string",
  "images": ["base64_encoded_image_1", "base64_encoded_image_2", ...]
}
```

### 2. Mark Attendance
**POST** `/mark_attendance`
```json
{
  "image": "base64_encoded_image"
}
```

### 3. Admin Login
**POST** `/admin_login`
```json
{
  "username": "string",
  "password": "string"
}
```
Returns: `{ "token": "jwt_token" }`

### 4. Get Attendance Records (JWT Protected)
**GET** `/get_attendance`
Headers: `Authorization: Bearer <token>`

### 5. Dashboard Stats (JWT Protected)
**GET** `/dashboard_stats`
Headers: `Authorization: Bearer <token>`
Returns:
```json
{
  "total_students": number,
  "present_today": number,
  "absent_today": number
}
```

### 6. Export CSV (JWT Protected)
**GET** `/export_csv`
Headers: `Authorization: Bearer <token>`
Returns: CSV file download

## Tech Stack for Backend

- **Flask**: Web framework
- **face_recognition**: Face recognition library (requires dlib)
- **SQLAlchemy**: Database ORM
- **SQLite**: Database
- **PyJWT**: JWT token handling
- **bcrypt**: Password hashing
- **flask-cors**: CORS support

## Database Schema

### users table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  roll_number TEXT UNIQUE NOT NULL,
  class TEXT NOT NULL,
  section TEXT NOT NULL,
  encoding_path TEXT NOT NULL
);
```

### attendance table
```sql
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  confidence REAL NOT NULL,
  source TEXT DEFAULT 'scanner'
);
```

### admins table
```sql
CREATE TABLE admins (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
```

## Environment Configuration

Create a `.env` file in your frontend with:
```
VITE_API_BASE_URL=http://localhost:5000
```

For production, update this to your deployed backend URL.

## Deployment

The frontend and backend should be deployed separately:

1. **Frontend**: Deploy this React application on Lovable (already configured)
2. **Backend**: Deploy your Flask application on:
   - Railway
   - Render
   - Heroku
   - AWS EC2
   - Or any Python-compatible hosting service

Make sure to update `VITE_API_BASE_URL` to point to your deployed backend.

## CORS Configuration

Your Flask backend must allow requests from your frontend domain. Example:

```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["https://your-lovable-app.lovable.app"])
```

## Face Recognition Processing

The face recognition processing happens entirely on the backend using Python's `face_recognition` library, which requires:
- Python 3.7+
- dlib
- face_recognition
- cmake (for dlib installation)

Note: Face recognition processing is computationally intensive and requires significant resources.
