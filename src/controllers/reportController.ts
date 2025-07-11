import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export class ReportController {
  
  getDashboardData = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    
    // Get total counts
    const totalStudents = await db.collection('students').countDocuments({ isActive: true });
    const totalTeachers = await db.collection('teachers').countDocuments({ isActive: true });
    const totalUsers = await db.collection('users').countDocuments({ isActive: true });
    
    // Get today's attendance
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    const todayAttendance = await db.collection('attendance').aggregate([
      {
        $match: {
          date: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    // Get overdue fees
    const overdueFees = await db.collection('fees').countDocuments({
      status: 'overdue',
      dueDate: { $lt: new Date() }
    });
    
    // Get pending homework submissions
    const pendingHomework = await db.collection('homework_submissions').countDocuments({
      status: 'pending'
    });
    
    // Get recent activities (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentStudents = await db.collection('students').countDocuments({
      createdAt: { $gte: weekAgo }
    });
    
    const recentTeachers = await db.collection('teachers').countDocuments({
      createdAt: { $gte: weekAgo }
    });
    
    // Monthly fee collection
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const monthlyFeeCollection = await db.collection('fee_payments').aggregate([
      {
        $match: {
          paymentDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPayments: { $sum: 1 }
        }
      }
    ]).toArray();
    
    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalTeachers,
          totalUsers,
          overdueFees,
          pendingHomework
        },
        todayAttendance: todayAttendance.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {} as any),
        recentActivities: {
          newStudents: recentStudents,
          newTeachers: recentTeachers
        },
        monthlyFeeCollection: monthlyFeeCollection[0] || { totalAmount: 0, totalPayments: 0 }
      }
    });
  });

  getStudentReport = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, class: className, section } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const db = getDB();
    const filter: any = { isActive: true };
    
    if (className) {
      filter.class = className;
    }
    
    if (section) {
      filter.section = section;
    }
    
    const students = await db.collection('students')
      .find(filter)
      .skip(skip)
      .limit(parseInt(limit as string))
      .toArray();
    
    const total = await db.collection('students').countDocuments(filter);
    
    // Get attendance summary for each student
    const studentsWithAttendance = await Promise.all(
      students.map(async (student) => {
        const attendanceStats = await db.collection('attendance').aggregate([
          { $match: { studentId: student._id } },
          {
            $group: {
              _id: null,
              totalDays: { $sum: 1 },
              presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
            }
          }
        ]).toArray();
        
        const stats = attendanceStats[0] || { totalDays: 0, presentDays: 0 };
        return {
          ...student,
          attendancePercentage: stats.totalDays > 0 ? (stats.presentDays / stats.totalDays) * 100 : 0
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        students: studentsWithAttendance,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  });

  getTeacherReport = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, subject } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const db = getDB();
    const filter: any = { isActive: true };
    
    if (subject) {
      filter.subjects = { $in: [subject] };
    }
    
    const teachers = await db.collection('teachers')
      .find(filter)
      .skip(skip)
      .limit(parseInt(limit as string))
      .toArray();
    
    const total = await db.collection('teachers').countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        teachers,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  });

  getAttendanceReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, class: className, section } = req.query;
    
    const db = getDB();
    
    const matchFilter: any = {};
    
    if (startDate && endDate) {
      matchFilter.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }
    
    // If class filter is provided, get students from that class
    if (className) {
      const studentFilter: any = { class: className, isActive: true };
      if (section) {
        studentFilter.section = section;
      }
      
      const students = await db.collection('students').find(studentFilter).toArray();
      const studentIds = students.map(s => s._id);
      matchFilter.studentId = { $in: studentIds };
    }
    
    const attendanceReport = await db.collection('attendance').aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$studentId',
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          excusedDays: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $project: {
          studentId: '$_id',
          studentName: { $concat: [{ $arrayElemAt: ['$student.firstName', 0] }, ' ', { $arrayElemAt: ['$student.lastName', 0] }] },
          class: { $arrayElemAt: ['$student.class', 0] },
          section: { $arrayElemAt: ['$student.section', 0] },
          totalDays: 1,
          presentDays: 1,
          absentDays: 1,
          lateDays: 1,
          excusedDays: 1,
          attendancePercentage: {
            $multiply: [
              { $divide: ['$presentDays', '$totalDays'] },
              100
            ]
          }
        }
      },
      { $sort: { attendancePercentage: -1 } }
    ]).toArray();
    
    res.json({
      success: true,
      data: attendanceReport
    });
  });

  getStudentAttendanceReport = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    
    const db = getDB();
    
    const matchFilter: any = {
      studentId: new ObjectId(studentId)
    };
    
    if (startDate && endDate) {
      matchFilter.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }
    
    const report = await db.collection('attendance').aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$studentId',
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          excusedDays: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $project: {
          studentId: '$_id',
          studentName: { $concat: [{ $arrayElemAt: ['$student.firstName', 0] }, ' ', { $arrayElemAt: ['$student.lastName', 0] }] },
          totalDays: 1,
          presentDays: 1,
          absentDays: 1,
          lateDays: 1,
          excusedDays: 1,
          attendancePercentage: {
            $multiply: [
              { $divide: ['$presentDays', '$totalDays'] },
              100
            ]
          }
        }
      }
    ]).toArray();
    
    // Get detailed attendance records
    const attendanceRecords = await db.collection('attendance')
      .find(matchFilter)
      .sort({ date: -1 })
      .toArray();
    
    res.json({
      success: true,
      data: {
        summary: report[0] || null,
        records: attendanceRecords
      }
    });
  });

  getClassAttendanceReport = asyncHandler(async (req: Request, res: Response) => {
    const { className } = req.params;
    const { startDate, endDate, section } = req.query;
    
    const db = getDB();
    
    // Get students from the class
    const studentFilter: any = { class: className, isActive: true };
    if (section) {
      studentFilter.section = section;
    }
    
    const students = await db.collection('students').find(studentFilter).toArray();
    const studentIds = students.map(s => s._id);
    
    const matchFilter: any = {
      studentId: { $in: studentIds }
    };
    
    if (startDate && endDate) {
      matchFilter.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }
    
    const classReport = await db.collection('attendance').aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$studentId',
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          excusedDays: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $project: {
          studentId: '$_id',
          studentName: { $concat: [{ $arrayElemAt: ['$student.firstName', 0] }, ' ', { $arrayElemAt: ['$student.lastName', 0] }] },
          rollNumber: { $arrayElemAt: ['$student.rollNumber', 0] },
          totalDays: 1,
          presentDays: 1,
          absentDays: 1,
          lateDays: 1,
          excusedDays: 1,
          attendancePercentage: {
            $multiply: [
              { $divide: ['$presentDays', '$totalDays'] },
              100
            ]
          }
        }
      },
      { $sort: { rollNumber: 1 } }
    ]).toArray();
    
    res.json({
      success: true,
      data: {
        class: className,
        section: section || 'All',
        students: classReport
      }
    });
  });

  getFeeReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, status } = req.query;
    
    const db = getDB();
    
    const matchFilter: any = {};
    
    if (startDate && endDate) {
      matchFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }
    
    if (status) {
      matchFilter.status = status;
    }
    
    const feeReport = await db.collection('fees').aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $project: {
          studentId: 1,
          studentName: { $concat: [{ $arrayElemAt: ['$student.firstName', 0] }, ' ', { $arrayElemAt: ['$student.lastName', 0] }] },
          class: { $arrayElemAt: ['$student.class', 0] },
          section: { $arrayElemAt: ['$student.section', 0] },
          feeType: 1,
          amount: 1,
          dueDate: 1,
          status: 1,
          academicYear: 1,
          month: 1
        }
      },
      { $sort: { dueDate: 1 } }
    ]).toArray();
    
    // Get summary
    const summary = await db.collection('fees').aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    res.json({
      success: true,
      data: {
        fees: feeReport,
        summary: summary.reduce((acc, curr) => {
          acc[curr._id] = {
            totalAmount: curr.totalAmount,
            count: curr.count
          };
          return acc;
        }, {} as any)
      }
    });
  });

  getStudentFeeReport = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { academicYear } = req.query;
    
    const db = getDB();
    
    const matchFilter: any = {
      studentId: new ObjectId(studentId)
    };
    
    if (academicYear) {
      matchFilter.academicYear = academicYear;
    }
    
    const feeReport = await db.collection('fees').aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'fee_payments',
          localField: '_id',
          foreignField: 'feeId',
          as: 'payments'
        }
      },
      {
        $project: {
          feeType: 1,
          amount: 1,
          dueDate: 1,
          status: 1,
          academicYear: 1,
          month: 1,
          paidAmount: { $sum: '$payments.amount' },
          paymentHistory: '$payments'
        }
      },
      { $sort: { dueDate: 1 } }
    ]).toArray();
    
    res.json({
      success: true,
      data: feeReport
    });
  });

  getOverdueFeeReport = asyncHandler(async (req: Request, res: Response) => {
    const db = getDB();
    
    const overdueFees = await db.collection('fees').aggregate([
      {
        $match: {
          status: { $in: ['pending', 'partial'] },
          dueDate: { $lt: new Date() }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $project: {
          studentId: 1,
          studentName: { $concat: [{ $arrayElemAt: ['$student.firstName', 0] }, ' ', { $arrayElemAt: ['$student.lastName', 0] }] },
          class: { $arrayElemAt: ['$student.class', 0] },
          section: { $arrayElemAt: ['$student.section', 0] },
          feeType: 1,
          amount: 1,
          dueDate: 1,
          status: 1,
          overdueDays: {
            $divide: [
              { $subtract: [new Date(), '$dueDate'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      { $sort: { overdueDays: -1 } }
    ]).toArray();
    
    res.json({
      success: true,
      data: overdueFees
    });
  });

  getHomeworkReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, subject, class: className } = req.query;
    
    const db = getDB();
    
    const matchFilter: any = {};
    
    if (startDate && endDate) {
      matchFilter.assignedDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }
    
    if (subject) {
      matchFilter.subject = subject;
    }
    
    if (className) {
      matchFilter.class = className;
    }
    
    const homeworkReport = await db.collection('homework').aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'homework_submissions',
          localField: '_id',
          foreignField: 'homeworkId',
          as: 'submissions'
        }
      },
      {
        $project: {
          title: 1,
          subject: 1,
          class: 1,
          section: 1,
          assignedDate: 1,
          dueDate: 1,
          totalMarks: 1,
          totalSubmissions: { $size: '$submissions' },
          submittedOnTime: {
            $size: {
              $filter: {
                input: '$submissions',
                cond: { $lte: ['$$this.submissionDate', '$dueDate'] }
              }
            }
          },
          lateSubmissions: {
            $size: {
              $filter: {
                input: '$submissions',
                cond: { $gt: ['$$this.submissionDate', '$dueDate'] }
              }
            }
          },
          gradedSubmissions: {
            $size: {
              $filter: {
                input: '$submissions',
                cond: { $eq: ['$$this.status', 'graded'] }
              }
            }
          }
        }
      },
      { $sort: { assignedDate: -1 } }
    ]).toArray();
    
    res.json({
      success: true,
      data: homeworkReport
    });
  });

  getStudentHomeworkReport = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    
    const db = getDB();
    
    const matchFilter: any = {
      studentId: new ObjectId(studentId)
    };
    
    if (startDate && endDate) {
      matchFilter.submissionDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }
    
    const homeworkReport = await db.collection('homework_submissions').aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'homework',
          localField: 'homeworkId',
          foreignField: '_id',
          as: 'homework'
        }
      },
      {
        $project: {
          homeworkTitle: { $arrayElemAt: ['$homework.title', 0] },
          subject: { $arrayElemAt: ['$homework.subject', 0] },
          totalMarks: { $arrayElemAt: ['$homework.totalMarks', 0] },
          marksObtained: 1,
          submissionDate: 1,
          dueDate: { $arrayElemAt: ['$homework.dueDate', 0] },
          status: 1,
          feedback: 1,
          isLate: { $gt: ['$submissionDate', { $arrayElemAt: ['$homework.dueDate', 0] }] }
        }
      },
      { $sort: { submissionDate: -1 } }
    ]).toArray();
    
    res.json({
      success: true,
      data: homeworkReport
    });
  });

  getClassHomeworkReport = asyncHandler(async (req: Request, res: Response) => {
    const { className } = req.params;
    const { startDate, endDate, section } = req.query;
    
    const db = getDB();
    
    const matchFilter: any = {
      class: className
    };
    
    if (section) {
      matchFilter.section = section;
    }
    
    if (startDate && endDate) {
      matchFilter.assignedDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }
    
    const classHomeworkReport = await db.collection('homework').aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'homework_submissions',
          localField: '_id',
          foreignField: 'homeworkId',
          as: 'submissions'
        }
      },
      {
        $project: {
          title: 1,
          subject: 1,
          assignedDate: 1,
          dueDate: 1,
          totalMarks: 1,
          submissionRate: {
            $multiply: [
              {
                $divide: [
                  { $size: '$submissions' },
                  { $literal: 1 } // This should be the total number of students in the class
                ]
              },
              100
            ]
          },
          averageMarks: { $avg: '$submissions.marksObtained' },
          submissions: '$submissions'
        }
      },
      { $sort: { assignedDate: -1 } }
    ]).toArray();
    
    res.json({
      success: true,
      data: classHomeworkReport
    });
  });

  getAcademicPerformanceReport = asyncHandler(async (req: Request, res: Response) => {
    const { class: className, section, academicYear } = req.query;
    
    const db = getDB();
    
    // Get students based on filter
    const studentFilter: any = { isActive: true };
    if (className) {
      studentFilter.class = className;
    }
    if (section) {
      studentFilter.section = section;
    }
    
    const students = await db.collection('students').find(studentFilter).toArray();
    
    // Get performance data for each student
    const performanceData = await Promise.all(
      students.map(async (student) => {
        // Get attendance percentage
        const attendanceStats = await db.collection('attendance').aggregate([
          { $match: { studentId: student._id } },
          {
            $group: {
              _id: null,
              totalDays: { $sum: 1 },
              presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
            }
          }
        ]).toArray();
        
        // Get homework performance
        const homeworkStats = await db.collection('homework_submissions').aggregate([
          { $match: { studentId: student._id, status: 'graded' } },
          {
            $group: {
              _id: null,
              totalSubmissions: { $sum: 1 },
              totalMarks: { $sum: '$marksObtained' },
              maxMarks: { $sum: '$totalMarks' }
            }
          }
        ]).toArray();
        
        // Get fee status
        const feeStats = await db.collection('fees').aggregate([
          { $match: { studentId: student._id } },
          {
            $group: {
              _id: null,
              totalFees: { $sum: '$amount' },
              paidFees: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
            }
          }
        ]).toArray();
        
        const attendance = attendanceStats[0] || { totalDays: 0, presentDays: 0 };
        const homework = homeworkStats[0] || { totalSubmissions: 0, totalMarks: 0, maxMarks: 0 };
        const fees = feeStats[0] || { totalFees: 0, paidFees: 0 };
        
        return {
          student: {
            id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            rollNumber: student.rollNumber,
            class: student.class,
            section: student.section
          },
          attendance: {
            percentage: attendance.totalDays > 0 ? (attendance.presentDays / attendance.totalDays) * 100 : 0,
            totalDays: attendance.totalDays,
            presentDays: attendance.presentDays
          },
          homework: {
            percentage: homework.maxMarks > 0 ? (homework.totalMarks / homework.maxMarks) * 100 : 0,
            totalSubmissions: homework.totalSubmissions,
            averageMarks: homework.totalSubmissions > 0 ? homework.totalMarks / homework.totalSubmissions : 0
          },
          fees: {
            percentage: fees.totalFees > 0 ? (fees.paidFees / fees.totalFees) * 100 : 0,
            totalFees: fees.totalFees,
            paidFees: fees.paidFees,
            pendingFees: fees.totalFees - fees.paidFees
          }
        };
      })
    );
    
    res.json({
      success: true,
      data: performanceData
    });
  });

  exportStudentData = asyncHandler(async (req: Request, res: Response) => {
    // In a real application, you would generate and return a CSV or Excel file
    res.json({
      success: true,
      message: 'Student data export functionality to be implemented'
    });
  });

  exportAttendanceData = asyncHandler(async (req: Request, res: Response) => {
    // In a real application, you would generate and return a CSV or Excel file
    res.json({
      success: true,
      message: 'Attendance data export functionality to be implemented'
    });
  });

  exportFeeData = asyncHandler(async (req: Request, res: Response) => {
    // In a real application, you would generate and return a CSV or Excel file
    res.json({
      success: true,
      message: 'Fee data export functionality to be implemented'
    });
  });
}
