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
}

export interface Student {
  id: string;
  groupId: string;
  name: string;
  matricula: string;
  accessCode: string;
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  groupId: string;
  name: string;
  percentage: number; // e.g. 30 for 30%
}

export interface Grade {
  id: string;
  studentId: string;
  categoryId: string;
  activityName: string;
  grade: number; // 0 to 100
  date: string;
}
