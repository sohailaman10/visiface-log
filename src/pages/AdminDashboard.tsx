import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Users, CheckCircle, XCircle, Download, Trash2, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AttendanceRecord {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  timestamp: string;
  confidence: number;
  source: string;
}

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  section: string;
  created_at: string;
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
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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
      const [statsResponse, attendanceResponse, studentsResponse] = await Promise.all([
        supabase.functions.invoke('dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        supabase.functions.invoke('get-attendance', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        supabase.functions.invoke('get-students', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsResponse.error) throw statsResponse.error;
      if (attendanceResponse.error) throw attendanceResponse.error;
      if (studentsResponse.error) throw studentsResponse.error;

      setStats(statsResponse.data);
      setAttendance(attendanceResponse.data);
      setStudents(studentsResponse.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch data",
        variant: "destructive",
      });
      if (error.message?.includes("Unauthorized")) {
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    const token = localStorage.getItem("adminToken");
    setDeletingId(student.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        headers: { Authorization: `Bearer ${token}` },
        body: { user_id: student.id },
      });

      if (error) throw error;

      toast({
        title: "Student Deleted",
        description: `${student.name} (${student.roll_number}) has been removed`,
      });

      // Refresh data
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete student",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
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
      const { data, error } = await supabase.functions.invoke('export-csv', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;

      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "Export Successful",
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

  const filteredStudents = students.filter((student) => {
    return (
      student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(studentSearchTerm.toLowerCase())
    );
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

        <Tabs defaultValue="attendance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
            <TabsTrigger value="students">Manage Students</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
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
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserX className="h-5 w-5" />
                    Manage Students
                  </CardTitle>
                  <Input
                    placeholder="Search students..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="md:w-64"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Registered On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No students found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.roll_number}</TableCell>
                            <TableCell>{student.class}</TableCell>
                            <TableCell>{student.section}</TableCell>
                            <TableCell>{new Date(student.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={deletingId === student.id}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {deletingId === student.id ? "Deleting..." : "Delete"}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Student?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete <strong>{student.name}</strong> ({student.roll_number})?
                                      This will also remove all their attendance records. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteStudent(student)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
