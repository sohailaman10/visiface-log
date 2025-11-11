# Face Recognition Attendance System

## 🎯 System Overview

A fully integrated AI-powered attendance system using face recognition. Built with:
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Lovable Cloud (Supabase) + Edge Functions
- **AI**: Lovable AI (Google Gemini) for face recognition
- **Database**: PostgreSQL with Row Level Security

## 🔐 Admin Credentials

- **Email**: sohailaman@gmail.com
- **Password**: admin123

## 📱 Features

### 1. **Home Page** (`/`)
- Welcome screen with navigation cards
- Access to Register Face and Mark Attendance

### 2. **Register Face** (`/register`)
- Enter student details (Name, Roll Number, Class, Section)
- Capture 20 face images via webcam
- AI stores face data securely in database

### 3. **Mark Attendance** (`/mark`)
- Live webcam scanner
- AI compares captured face with all registered users
- Records attendance with confidence score
- Success dialog with student details

### 4. **Admin Login** (`/admin/login`)
- Secure JWT-based authentication
- Access to admin dashboard

### 5. **Admin Dashboard** (`/admin/dashboard`)
- Real-time statistics:
  - Total Students
  - Present Today
  - Absent Today
- Attendance records table with:
  - Search by name/roll number
  - Date filter
  - CSV export functionality

## 🚀 How It Works

### Registration Process
1. Student enters personal information
2. System captures 20 face images from webcam
3. Images stored in database as reference
4. Edge function processes and saves data

### Attendance Marking
1. Student stands in front of camera
2. System captures current face image
3. AI compares with all registered faces using Lovable AI
4. If confidence ≥ 70%, attendance is marked
5. Record includes: name, timestamp, confidence score

### Admin Access
1. Login with admin credentials
2. View dashboard statistics
3. Search and filter attendance records
4. Export data to CSV

## 🔧 Technical Architecture

### Database Schema

**users table**
- `id`: UUID (primary key)
- `name`: TEXT
- `roll_number`: TEXT (unique)
- `class`: TEXT
- `section`: TEXT
- `reference_images`: JSONB (array of 20 base64 images)
- `created_at`: TIMESTAMP

**attendance table**
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key → users)
- `name`: TEXT
- `roll_number`: TEXT
- `class`: TEXT
- `section`: TEXT
- `confidence`: DECIMAL(5,2)
- `source`: TEXT ('scanner')
- `timestamp`: TIMESTAMP

**admins table**
- `id`: UUID (primary key)
- `email`: TEXT (unique)
- `password_hash`: TEXT
- `created_at`: TIMESTAMP

### Edge Functions

1. **register-user**: Stores user data and face images
2. **mark-attendance**: AI-powered face recognition and attendance logging
3. **admin-login**: JWT token generation for admin access
4. **get-attendance**: Fetch all attendance records
5. **dashboard-stats**: Calculate real-time statistics
6. **export-csv**: Generate CSV export of attendance data

### Face Recognition

Uses **Lovable AI** (Google Gemini 2.5 Flash) for face comparison:
- Multimodal vision capabilities
- Compares scanned face with up to 3 reference images per user
- Returns confidence percentage (0-100)
- Threshold: 70% for successful match

## 🎨 Design System

### Colors
- **Primary**: Blue gradient (`#4A90E2` → `#357ABD`)
- **Success**: Green (`#10B981`)
- **Destructive**: Red (`#EF4444`)
- **Background**: White
- **Foreground**: Dark gray

### Components
- shadcn/ui components with custom variants
- Responsive design for mobile and desktop
- Toast notifications for all actions
- Modal dialogs for success states

## 📊 Security Features

- Row Level Security (RLS) enabled on all tables
- JWT token authentication for admin routes
- Secure face data storage in database
- CORS protection on edge functions
- No hardcoded credentials in frontend

## 🔄 Data Flow

```
Student Registration:
Frontend → Edge Function → Database → Success

Attendance Marking:
Frontend → Edge Function → Lovable AI → Compare Faces → Database → Success

Admin Dashboard:
Frontend → Edge Function → Database → Display Data
```

## 💡 Usage Tips

### For Students
- Ensure good lighting when capturing face
- Look directly at camera
- Avoid sunglasses or face coverings
- Capture from multiple angles during registration

### For Admins
- Use search to quickly find specific students
- Filter by date to view daily attendance
- Export CSV for record keeping
- Monitor confidence scores for accuracy

## 🛠️ Troubleshooting

**Face not recognized**:
- Re-register with better lighting
- Ensure 20 clear images were captured
- Check confidence threshold settings

**Admin login fails**:
- Verify credentials: sohailaman@gmail.com / admin123
- Clear browser cache and retry

**Images not loading**:
- Check webcam permissions
- Refresh page and try again

## 📈 Future Enhancements

- Multiple admin accounts
- Student self-service portal
- Email notifications
- Real-time attendance updates
- Analytics and reporting
- Attendance history charts
- Bulk user import
- Mobile app integration

## 🔗 System Links

- **Frontend**: Hosted on Lovable
- **Backend**: Lovable Cloud (auto-managed)
- **Database**: PostgreSQL (Supabase)
- **AI**: Lovable AI Gateway

---

**Built with ❤️ using Lovable**
