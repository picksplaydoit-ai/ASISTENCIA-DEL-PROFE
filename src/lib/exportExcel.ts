/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from "xlsx";
import { Group, Student, Category, Grade, Activity, Attendance } from "../types";
import { calculateStudentGrades } from "../components/GradesTable";

export function exportGroupReportToExcel(params: {
  group?: Group;
  students: Student[];
  categories: Category[];
  grades: Grade[];
  attendances: Attendance[];
  activities: Activity[];
}) {
  const { group, students, categories, grades, attendances, activities } = params;

  // Deduplicate and sort attendances by date ascending
  const uniqueGroupAttendancesMap = new Map<string, Attendance>();
  attendances.forEach((a) => {
    if (a && a.date) {
      uniqueGroupAttendancesMap.set(a.date, a);
    }
  });
  const uniqueGroupAttendances = Array.from(uniqueGroupAttendancesMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const totalSessions = uniqueGroupAttendances.length;

  // Calculate results for all students
  const studentResults = students.map((student) =>
    calculateStudentGrades(
      student,
      categories,
      grades,
      uniqueGroupAttendances,
      group?.requiredAttendancePercentage || 0,
      activities
    )
  );

  // 1. SHEET: CALIFICACIONES (Grades with Faltas & Attendance summary)
  const gradesData = studentResults.map((res, i) => {
    const student = students[i];
    const row: Record<string, any> = {
      Matrícula: student.matricula,
      Alumno: student.name,
    };

    // Category averages
    categories.forEach((cat) => {
      row[`${cat.name} (${cat.percentage}%)`] = (res.categoryAverages[cat.id]?.avg || 0).toFixed(1);
    });

    // Detailed Attendance and Absence (Faltas) metrics
    row["Total Sesiones"] = totalSessions;
    row["Asistencias"] = res.presentClasses;
    row["Faltas"] = res.absentClasses;
    row["Justificadas"] = res.justifiedClasses;
    row["Asistencias (%)"] = totalSessions === 0 ? "—" : `${res.attendancePct.toFixed(1)}%`;
    row["Promedio Final"] = res.finalGrade;
    row["Estatus"] = res.statusText;

    return row;
  });

  // 2. SHEET: ASISTENCIAS Y FALTAS (Detailed date matrix with faltas)
  const attendanceData = studentResults.map((res, i) => {
    const student = students[i];
    const studentNotesList: string[] = [];
    const absentDatesList: string[] = [];

    const row: Record<string, any> = {
      Matrícula: student.matricula,
      Alumno: student.name,
      "Total Sesiones": totalSessions,
      "Asistencias": res.presentClasses,
      "Faltas": res.absentClasses,
      "Justificadas": res.justifiedClasses,
      "Asistencias (%)": totalSessions === 0 ? "—" : `${res.attendancePct.toFixed(1)}%`,
    };

    uniqueGroupAttendances.forEach((att) => {
      const status = att.records ? att.records[student.id] : undefined;
      let strStatus = "Falta";
      if (status === true || status === "present") {
        strStatus = "Presente";
      } else if (status === "justified") {
        strStatus = "Justificada";
      } else {
        strStatus = "Falta";
        absentDatesList.push(att.date);
      }

      const note = att.notes ? att.notes[student.id] : undefined;
      if (note && note.trim()) {
        strStatus += ` [${note.trim()}]`;
        studentNotesList.push(`${att.date}: ${note.trim()}`);
      }

      const colTitle = att.dayObservation ? `${att.date} (${att.dayObservation})` : att.date;
      row[colTitle] = strStatus;
    });

    row["Fechas de Falta"] = absentDatesList.length > 0 ? absentDatesList.join(", ") : "Ninguna";
    row["Observaciones / Justificantes"] = studentNotesList.join("; ") || "Ninguna";
    return row;
  });

  // 3. SHEET: REPORTE DE FALTAS (Dedicated sheet focusing on absences, risk & derecho)
  const faltasReportData = studentResults.map((res, i) => {
    const student = students[i];
    const absentDatesList: string[] = [];
    const notesList: string[] = [];

    uniqueGroupAttendances.forEach((att) => {
      const status = att.records ? att.records[student.id] : undefined;
      const isAbsent = status !== true && status !== "present" && status !== "justified";
      if (isAbsent) {
        absentDatesList.push(att.date);
      }
      const note = att.notes ? att.notes[student.id] : undefined;
      if (note && note.trim()) {
        notesList.push(`${att.date} [${att.dayObservation || "Nota"}]: ${note.trim()}`);
      }
    });

    let situacion = "Asistencia Regular";
    if (res.statusText === "SD" || !res.hasDerecho) {
      situacion = "SIN DERECHO (SD por Faltas)";
    } else if (res.absentClasses >= 3) {
      situacion = "Alerta: Alto número de Faltas";
    } else if (res.absentClasses === 0) {
      situacion = "Asistencia Perfecta (0 Faltas)";
    }

    return {
      Matrícula: student.matricula,
      Alumno: student.name,
      "Total Faltas": res.absentClasses,
      "Faltas Justificadas": res.justifiedClasses,
      "Total Asistencias": res.presentClasses,
      "Total Sesiones": totalSessions,
      "% Asistencia": totalSessions === 0 ? "—" : `${res.attendancePct.toFixed(1)}%`,
      "Mínimo Requerido": group?.requiredAttendancePercentage ? `${group.requiredAttendancePercentage}%` : "No fijado",
      "Situación de Asistencia": situacion,
      "Fechas con Falta": absentDatesList.length > 0 ? absentDatesList.join(", ") : "Sin faltas",
      "Notas y Justificantes": notesList.join("; ") || "Sin observaciones",
    };
  });

  // 4. SHEET: ACTIVIDADES DETALLADAS
  const activitiesData: any[] = [];
  const validActivitiesMap = new Map<string, Activity>(activities.map((a) => [a.id, a]));

  students.forEach((student) => {
    grades
      .filter((g) => {
        if (g.studentId !== student.id) return false;
        if (g.activityId && !validActivitiesMap.has(g.activityId)) return false;
        return true;
      })
      .forEach((g) => {
        const act = g.activityId ? validActivitiesMap.get(g.activityId) : undefined;
        const catId = act?.categoryId || g.categoryId;
        activitiesData.push({
          Matrícula: student.matricula,
          Alumno: student.name,
          Actividad: act?.name || g.activityName,
          Categoría: categories.find((c) => c.id === catId)?.name || "Sin Categoría",
          Fecha: g.date,
          Calificación: g.grade,
        });
      });
  });

  // Build Workbook
  const wb = XLSX.utils.book_new();

  const wsGrades = XLSX.utils.json_to_sheet(gradesData);
  const wsAttendance = XLSX.utils.json_to_sheet(attendanceData);
  const wsFaltas = XLSX.utils.json_to_sheet(faltasReportData);
  const wsActivities = XLSX.utils.json_to_sheet(activitiesData);

  // Set friendly column widths
  wsGrades["!cols"] = [
    { wch: 14 }, // Matrícula
    { wch: 32 }, // Alumno
    ...categories.map(() => ({ wch: 18 })),
    { wch: 14 }, // Total Sesiones
    { wch: 13 }, // Asistencias
    { wch: 12 }, // Faltas
    { wch: 14 }, // Justificadas
    { wch: 16 }, // Asistencias (%)
    { wch: 15 }, // Promedio Final
    { wch: 14 }, // Estatus
  ];

  wsFaltas["!cols"] = [
    { wch: 14 }, // Matrícula
    { wch: 32 }, // Alumno
    { wch: 14 }, // Total Faltas
    { wch: 18 }, // Faltas Justificadas
    { wch: 16 }, // Total Asistencias
    { wch: 14 }, // Total Sesiones
    { wch: 15 }, // % Asistencia
    { wch: 18 }, // Mínimo Requerido
    { wch: 28 }, // Situación de Asistencia
    { wch: 35 }, // Fechas con Falta
    { wch: 45 }, // Notas y Justificantes
  ];

  // Append sheets
  XLSX.utils.book_append_sheet(wb, wsGrades, "Calificaciones");
  XLSX.utils.book_append_sheet(wb, wsAttendance, "Asistencias");
  XLSX.utils.book_append_sheet(wb, wsFaltas, "Reporte de Faltas");
  XLSX.utils.book_append_sheet(wb, wsActivities, "Actividades Detalladas");

  const safeGroupName = (group?.name || "Grupo").replace(/[\\/:*?"<>|]/g, "_");
  XLSX.writeFile(wb, `Reporte_Grupo_${safeGroupName}.xlsx`);
}
