/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Teacher {
  uid: string;
  name: string;
  email: string;
}

export interface Group {
  id: string;
  teacherId: string;
  name: string;
  schoolYear: string;
  createdAt: string;
  requiredAttendancePercentage?: number;
}

export interface Student {
  id: string;
  groupId: string;
  name: string;
  matricula: string;
  accessCode: string;
  active: boolean;
  createdAt: string;
  manualFinalGrade?: number | null;
  manualStatus?: "Aprobado" | "Reprobado" | "SD" | null;
}

export interface Team {
  id: string;
  groupId: string;
  name: string;
  studentIds: string[];
}

export interface Category {
  id: string;
  groupId: string;
  name: string;
  percentage: number; // e.g. 30 for 30%
}

export type ActivityType = "numeric" | "boolean" | "total";

export interface Activity {
  id: string;
  groupId: string;
  categoryId: string;
  name: string;
  type: ActivityType;
  totalWorks?: number;
  isTeamActivity: boolean;
  date: string;
}

export interface Grade {
  id: string;
  studentId: string;
  categoryId: string;
  activityId?: string; // Optional for backward compatibility with old grades
  activityName?: string; // Optional for backward compatibility
  grade?: number; // Numeric grade 0-100
  delivered?: boolean; // For type 'boolean'
  deliveredWorks?: number; // For type 'total'
  date: string;
}

export interface Attendance {
  id: string;
  groupId: string;
  date: string;
  records: Record<string, boolean | "present" | "absent" | "justified">; // studentId -> status
}
