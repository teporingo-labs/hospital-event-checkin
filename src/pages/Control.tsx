import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Download, QrCode, Users, Clock, FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface Participant {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  organization?: string;
  qr_code: string;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  participant_id: string;
  timestamp: string;
  participants: {
    full_name: string;
    email: string;
    organization?: string;
  };
}

const Control = () => {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false });

      if (participantsError) throw participantsError;

      // Fetch attendance with participant details
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          id,
          participant_id,
          timestamp,
          participants (
            full_name,
            email,
            organization
          )
        `)
        .order('timestamp', { ascending: false });

      if (attendanceError) throw attendanceError;

      setParticipants(participantsData || []);
      setAttendance(attendanceData || []);
    } catch (error: any) {
      console.error('Data fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const downloadParticipantQR = (participant: Participant) => {
    const link = document.createElement('a');
    link.href = participant.qr_code;
    link.download = `qr-${participant.full_name.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportParticipantsCSV = () => {
    const csvData = participants.map(p => ({
      'Full Name': p.full_name,
      'Email': p.email,
      'Phone': p.phone || '',
      'Organization': p.organization || '',
      'Registration Date': new Date(p.created_at).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');
    XLSX.writeFile(wb, 'participants.csv');
  };

  const exportParticipantsExcel = () => {
    const excelData = participants.map(p => ({
      'Full Name': p.full_name,
      'Email': p.email,
      'Phone': p.phone || '',
      'Organization': p.organization || '',
      'Registration Date': new Date(p.created_at).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');
    XLSX.writeFile(wb, 'participants.xlsx');
  };

  const exportParticipantsPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Event Participants', 20, 20);
    
    let y = 40;
    doc.setFontSize(10);
    
    participants.forEach((participant, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(`${index + 1}. ${participant.full_name}`, 20, y);
      doc.text(`Email: ${participant.email}`, 30, y + 5);
      if (participant.phone) doc.text(`Phone: ${participant.phone}`, 30, y + 10);
      if (participant.organization) doc.text(`Organization: ${participant.organization}`, 30, y + 15);
      doc.text(`Registered: ${new Date(participant.created_at).toLocaleDateString()}`, 30, y + 20);
      
      y += 30;
    });
    
    doc.save('participants.pdf');
  };

  const exportAttendanceCSV = () => {
    const csvData = attendance.map(a => ({
      'Participant Name': a.participants.full_name,
      'Email': a.participants.email,
      'Organization': a.participants.organization || '',
      'Check-in Time': new Date(a.timestamp).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, 'attendance.csv');
  };

  const exportAttendanceExcel = () => {
    const excelData = attendance.map(a => ({
      'Participant Name': a.participants.full_name,
      'Email': a.participants.email,
      'Organization': a.participants.organization || '',
      'Check-in Time': new Date(a.timestamp).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, 'attendance.xlsx');
  };

  const exportAttendancePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Event Attendance', 20, 20);
    
    let y = 40;
    doc.setFontSize(10);
    
    attendance.forEach((record, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(`${index + 1}. ${record.participants.full_name}`, 20, y);
      doc.text(`Email: ${record.participants.email}`, 30, y + 5);
      if (record.participants.organization) doc.text(`Organization: ${record.participants.organization}`, 30, y + 10);
      doc.text(`Check-in: ${new Date(record.timestamp).toLocaleString()}`, 30, y + 15);
      
      y += 25;
    });
    
    doc.save('attendance.pdf');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading event data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">Event Control Panel</h1>
          <Link to="/scanner">
            <Button>
              <QrCode className="h-4 w-4 mr-2" />
              Open QR Scanner
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{participants.length}</div>
              <p className="text-xs text-muted-foreground">
                Registered for the event
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendance.length}</div>
              <p className="text-xs text-muted-foreground">
                Check-ins recorded
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Participants Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Registered Participants</CardTitle>
                <CardDescription>
                  All participants registered for the event
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={exportParticipantsCSV} size="sm" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button onClick={exportParticipantsExcel} size="sm" variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button onClick={exportParticipantsPDF} size="sm" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>QR Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">{participant.full_name}</TableCell>
                      <TableCell>{participant.email}</TableCell>
                      <TableCell>{participant.phone || '-'}</TableCell>
                      <TableCell>{participant.organization || '-'}</TableCell>
                      <TableCell>{new Date(participant.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadParticipantQR(participant)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Attendance Log</CardTitle>
                <CardDescription>
                  All check-ins recorded during the event
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={exportAttendanceCSV} size="sm" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button onClick={exportAttendanceExcel} size="sm" variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button onClick={exportAttendancePDF} size="sm" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Check-in Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.participants.full_name}</TableCell>
                      <TableCell>{record.participants.email}</TableCell>
                      <TableCell>{record.participants.organization || '-'}</TableCell>
                      <TableCell>{new Date(record.timestamp).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Control;