import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Users, CheckCircle, XCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AttendanceRecord {
  id: number;
  name: string;
  roll_number: string;
  class: string;
  timestamp: string;
  confidence: number;
  source: string;
}

interface DashboardStats {
  total_students: number;
  present_today: number;
  absent_today: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total_students: 0,
    present_today: 0,
    absent_today: 0,
  });
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("adminToken");
    try {
      const [statsRes, attendanceRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dashboard_stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/get_attendance`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setStats(statsRes.data);
      setAttendance(attendanceRes.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to fetch data",
        variant: "destructive",
      });
      if (error.response?.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
    navigate("/admin/login");
  };

  const handleExportCSV = async () => {
    const token = localStorage.getItem("adminToken");
    try {
      const response = await axios.get(`${API_BASE_URL}/export_csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "✅ Export Successful",
        description: "Attendance data exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const filteredAttendance = attendance.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.roll_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter
      ? record.timestamp.startsWith(dateFilter)
      : true;
    return matchesSearch && matchesDate;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_students}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.present_today}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.absent_today}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <CardTitle>Attendance Records</CardTitle>
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <Input
                  placeholder="Search by name or roll number"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="md:w-64"
                />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="md:w-48"
                />
                <Button onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.id}</TableCell>
                        <TableCell className="font-medium">{record.name}</TableCell>
                        <TableCell>{record.roll_number}</TableCell>
                        <TableCell>{record.class}</TableCell>
                        <TableCell>{new Date(record.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{record.confidence}%</TableCell>
                        <TableCell>{record.source}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;