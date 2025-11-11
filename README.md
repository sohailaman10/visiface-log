# Face Recognition Attendance System

## 🎓 Automated Attendance Tracking with AI

An intelligent attendance management system that uses advanced face recognition technology powered by Lovable AI.

## 🚀 Quick Start

### Admin Login
- **Email**: sohailaman@gmail.com  
- **Password**: admin123

### How to Use

1. **Register Students** (`/register`)
   - Enter student details
   - Capture 20 face images
   - System stores face data securely

2. **Mark Attendance** (`/mark`)
   - Student looks at camera
   - AI recognizes face automatically
   - Attendance recorded with timestamp

3. **Admin Dashboard** (`/admin/dashboard`)
   - View attendance statistics
   - Search and filter records
   - Export data to CSV

## 📖 Documentation

See [SYSTEM_GUIDE.md](./SYSTEM_GUIDE.md) for complete system documentation including:
- Technical architecture
- Database schema
- Security features
- Troubleshooting guide

## 🏗️ Built With

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Lovable Cloud (Supabase Edge Functions)
- **AI**: Lovable AI (Google Gemini 2.5 Flash)
- **Database**: PostgreSQL with Row Level Security
- **UI Components**: shadcn/ui

## 🔐 Security

- JWT-based admin authentication
- Row Level Security on all database tables
- Encrypted face data storage
- CORS-protected API endpoints

## 📊 Features

✅ AI-powered face recognition  
✅ Real-time attendance tracking  
✅ Admin dashboard with analytics  
✅ Search and filter capabilities  
✅ CSV export functionality  
✅ Responsive mobile design  
✅ Toast notifications  
✅ Secure authentication  

## 🎯 System Flow

```
Registration → Capture 20 Images → Store in Database
Attendance → Scan Face → AI Match → Record Attendance  
Admin → Login → View Dashboard → Export Reports
```

## 📱 Pages

- `/` - Home page with navigation
- `/register` - Student face registration
- `/mark` - Attendance marking scanner
- `/admin/login` - Admin authentication
- `/admin/dashboard` - Attendance management

---

## Project Info

**URL**: https://lovable.dev/projects/73b22e53-f1aa-48bd-aada-6fa7fb9a9a19

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/73b22e53-f1aa-48bd-aada-6fa7fb9a9a19) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/73b22e53-f1aa-48bd-aada-6fa7fb9a9a19) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
